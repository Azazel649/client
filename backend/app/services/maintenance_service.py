from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.maintenance.duration_calculator import calculate_maintenance_duration
from ..algorithms.maintenance.maintenance_rule import decide_maintenance
from ..algorithms.maintenance.window_generator import generate_window
from ..models.maintenance import MaintenancePlan
from ..models.task import ProductionTask
from ..repositories.device_repository import DeviceRepository
from ..repositories.health_repository import HealthRepository
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.prediction_repository import PredictionRepository
from ..repositories.task_repository import TaskRepository
from ..schemas.maintenance_schema import (
    MaintenanceGanttItem,
    MaintenanceGanttResponse,
    MaintenanceGenerateItem,
    MaintenanceGenerateResponse,
    MaintenancePlanResponse,
    MaintenancePlanUpdateRequest,
)


class MaintenanceService:
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.health = HealthRepository(db)
        self.predictions = PredictionRepository(db)
        self.maintenance = MaintenanceRepository(db)
        self.tasks = TaskRepository(db)

    def list_plans(self, status_value: str | None = None, device_id: str | None = None) -> list[MaintenancePlanResponse]:
        return [
            MaintenancePlanResponse.model_validate(plan)
            for plan in self.maintenance.list_plans(status=status_value, device_id=device_id)
        ]

    def generate_windows(self, device_ids: list[str]) -> MaintenanceGenerateResponse:
        target_ids = device_ids or [device.device_id for device in self.devices.get_all_devices()]
        items: list[MaintenanceGenerateItem] = []
        for device_id in target_ids:
            items.append(self._generate_for_device(device_id))
        self._cache_active_windows()
        return MaintenanceGenerateResponse(items=items)

    def update_plan(self, plan_id: str, payload: MaintenancePlanUpdateRequest) -> MaintenancePlanResponse:
        values = payload.model_dump(exclude_unset=True)
        if "plan_start_time" in values and "plan_end_time" in values and values["plan_start_time"] >= values["plan_end_time"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="维护开始时间必须早于结束时间")
        if "plan_start_time" in values or "plan_end_time" in values:
            current = self._require_plan(plan_id)
            start = values.get("plan_start_time", current.plan_start_time)
            end = values.get("plan_end_time", current.plan_end_time)
            values["duration_minutes"] = round((end - start).total_seconds() / 60)
        plan = self.maintenance.update_plan(plan_id, **values)
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="维护计划不存在")
        self._cache_active_windows()
        return MaintenancePlanResponse.model_validate(plan)

    def delete_plan(self, plan_id: str) -> None:
        plan = self._require_plan(plan_id)
        self.maintenance.delete(plan)
        self._cache_active_windows()

    def get_gantt(self) -> MaintenanceGanttResponse:
        items: list[MaintenanceGanttItem] = []
        for plan in self.maintenance.get_active_windows():
            conflicts = self._find_conflict_task_ids(plan.device_id, plan.plan_start_time, plan.plan_end_time)
            items.append(
                MaintenanceGanttItem(
                    id=plan.plan_id,
                    device_id=plan.device_id,
                    title=f"{plan.device_id} {'更换' if plan.maintenance_type == 'replace' else '检修'}",
                    start_time=plan.plan_start_time,
                    end_time=plan.plan_end_time,
                    item_type="maintenance",
                    status=plan.status,
                    conflict_task_ids=conflicts,
                )
            )
        return MaintenanceGanttResponse(items=items)

    def _generate_for_device(self, device_id: str) -> MaintenanceGenerateItem:
        device = self.devices.get_by_id(device_id)
        if device is None:
            return MaintenanceGenerateItem(device_id=device_id, generated=False, message="设备不存在")

        health = self.health.get_latest_health(device_id)
        if health is None:
            return MaintenanceGenerateItem(device_id=device_id, generated=False, message="缺少 HI/RUL 健康评估记录，暂不能生成维护窗口")

        prediction = self.predictions.get_latest_prediction(device_id)
        decision = decide_maintenance(
            health_index=health.health_index,
            rul_minutes=health.rul_minutes,
            fault_type=prediction.fault_type if prediction else None,
            fault_probability=prediction.probability if prediction else None,
        )
        if not decision.should_generate:
            return MaintenanceGenerateItem(device_id=device_id, generated=False, message=decision.reason)

        assert decision.maintenance_type is not None
        assert decision.risk_level is not None
        duration = calculate_maintenance_duration(decision.maintenance_type, decision.risk_level)
        window = generate_window(datetime.now(), health.rul_minutes, duration)
        conflicts = self._find_conflict_task_ids(device_id, window.start_time, window.end_time)
        reason = decision.reason
        if conflicts:
            reason = f"{reason} 与生产任务 {', '.join(conflicts)} 存在时间重叠，后续需进行协同排程。"

        plan = MaintenancePlan(
            plan_id=f"MP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6]}",
            device_id=device_id,
            plan_start_time=window.start_time,
            plan_end_time=window.end_time,
            maintenance_type=decision.maintenance_type,
            duration_minutes=duration,
            deadline=window.deadline,
            risk_level=decision.risk_level,
            source="auto",
            reason=reason,
            status="pending",
        )
        self.maintenance.create_plan(plan)
        self._cache_plan(plan)
        return MaintenanceGenerateItem(
            device_id=device_id,
            generated=True,
            message="维护窗口已生成",
            plan=MaintenancePlanResponse.model_validate(plan),
            conflict_task_ids=conflicts,
        )

    def _require_plan(self, plan_id: str) -> MaintenancePlan:
        plan = self.maintenance.get(plan_id)
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="维护计划不存在")
        return plan

    def _find_conflict_task_ids(self, device_id: str, start_time: datetime, end_time: datetime) -> list[str]:
        conflicts: list[str] = []
        for task in self.tasks.get_tasks_by_device(device_id):
            if not _task_has_time(task):
                continue
            assert task.start_time is not None
            assert task.end_time is not None
            if task.start_time < end_time and task.end_time > start_time:
                conflicts.append(task.task_id)
        return conflicts

    def _cache_plan(self, plan: MaintenancePlan) -> None:
        self.redis.hset(
            f"maintenance:plan:{plan.plan_id}",
            mapping={
                "plan_id": plan.plan_id,
                "device_id": plan.device_id,
                "plan_start_time": plan.plan_start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "plan_end_time": plan.plan_end_time.strftime("%Y-%m-%d %H:%M:%S"),
                "maintenance_type": plan.maintenance_type or "",
                "risk_level": plan.risk_level or "",
                "status": plan.status,
            },
        )

    def _cache_active_windows(self) -> None:
        key = "maintenance:active_windows"
        self.redis.delete(key)
        for plan in self.maintenance.get_active_windows():
            self.redis.rpush(key, plan.plan_id)
            self._cache_plan(plan)


def _task_has_time(task: ProductionTask) -> bool:
    return task.start_time is not None and task.end_time is not None
