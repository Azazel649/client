from datetime import datetime
import json
from uuid import uuid4

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.dispatch.common import DispatchDevice, DispatchSolution, DispatchTask
from ..algorithms.dispatch.dispatch_pipeline import DispatchPipeline, DispatchPipelineParams
from ..models.schedule import ScheduleLog, SchedulePlan, SchedulePlanItem
from ..repositories.device_repository import DeviceRepository
from ..repositories.health_repository import HealthRepository
from ..repositories.schedule_repository import ScheduleLogRepository, SchedulePlanItemRepository, SchedulePlanRepository
from ..repositories.task_repository import TaskRepository
from ..schemas.dispatch_schema import DispatchDeviceState, DispatchPlanResponse, DispatchRunRequest
from ..schemas.schedule_schema import SchedulePlanItemResponse, SchedulePlanResponse


class DispatchService:
    def __init__(self, db: Session, redis_client: Redis):
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.health = HealthRepository(db)
        self.tasks = TaskRepository(db)
        self.plans = SchedulePlanRepository(db)
        self.items = SchedulePlanItemRepository(db)
        self.logs = ScheduleLogRepository(db)

    def run_dispatch(self, payload: DispatchRunRequest, operator: str | None = None) -> DispatchPlanResponse:
        now = datetime.now()
        devices = self._dispatch_devices(include_cached_load=False)
        tasks = self._dispatch_tasks()
        if not tasks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no schedulable production task")

        pipeline = DispatchPipeline(
            DispatchPipelineParams(
                population_size=payload.population_size,
                max_generation=payload.max_generation,
                mutation_rate=payload.mutation_rate,
                min_health_index=payload.min_health_index,
            )
        )
        solution = pipeline.run(tasks, devices, now)
        if not solution.feasible:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=solution.message)

        plan = self._save_solution(payload, solution, operator)
        plan_items = self.items.get_items_by_plan(plan.plan_id)
        self._write_redis_dispatch(plan, plan_items, devices)
        return DispatchPlanResponse(plan=_plan_response(plan, plan_items), device_states=self.get_device_states())

    def get_current_dispatch(self) -> DispatchPlanResponse:
        plan = self.plans.get_current_plan("adaptive_dispatch")
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="dispatch plan not found")
        return DispatchPlanResponse(
            plan=_plan_response(plan, self.items.get_items_by_plan(plan.plan_id)),
            device_states=self.get_device_states(),
        )

    def get_device_states(self) -> list[DispatchDeviceState]:
        devices = self._dispatch_devices(include_cached_load=True)
        task_count = self._task_count_by_device()
        return [
            DispatchDeviceState(
                device_id=device.device_id,
                device_type=device.device_type,
                status=device.status,
                health_index=device.health_index,
                rul_minutes=device.rul_minutes,
                current_load=device.current_load,
                task_count=task_count.get(device.device_id, 0),
                load_health_ratio=round(device.current_load / max(device.health_index, 1), 4),
            )
            for device in devices
        ]

    def _dispatch_devices(self, include_cached_load: bool = True) -> list[DispatchDevice]:
        output: list[DispatchDevice] = []
        for device in self.devices.get_all_devices():
            health_index, rul_minutes = self._health_state(device.device_id)
            output.append(
                DispatchDevice(
                    device_id=device.device_id,
                    device_type=device.device_type,
                    status=device.status,
                    health_index=health_index,
                    rul_minutes=rul_minutes,
                    current_load=self._device_current_load(device.device_id) if include_cached_load else 0.0,
                    max_load_rate=device.max_load_rate or 1.0,
                )
            )
        return output

    def _dispatch_tasks(self) -> list[DispatchTask]:
        return [
            DispatchTask(
                task_id=task.task_id,
                task_name=task.task_name,
                required_device_type=task.required_device_type,
                duration=task.duration or 1,
                priority=task.priority or 0,
                load_weight=task.load_weight or 1.0,
                due_time=task.due_time,
                predecessor_task_id=task.predecessor_task_id,
                assigned_device=task.assigned_device,
            )
            for task in self.tasks.get_pending_tasks()
        ]

    def _save_solution(self, payload: DispatchRunRequest, solution: DispatchSolution, operator: str | None) -> SchedulePlan:
        plan = SchedulePlan(
            plan_id=uuid4().hex,
            plan_type="adaptive_dispatch",
            plan_name=payload.plan_name or f"dispatch-{datetime.now():%Y%m%d%H%M%S}",
            total_delay=solution.metrics.total_delay,
            makespan=solution.metrics.makespan,
            avg_load_rate=solution.metrics.avg_load_rate,
            load_balance_score=solution.metrics.load_balance_score,
            health_match_score=solution.metrics.health_match_score,
            high_risk_load_rate=solution.metrics.high_risk_load_rate,
            status="draft" if payload.save_as_draft else "confirmed",
            algorithm="greedy_ga_health_dispatch",
            confirmed_by=None if payload.save_as_draft else operator,
            confirmed_time=None if payload.save_as_draft else datetime.now(),
            remark="health-aware greedy initial assignment optimized by genetic algorithm",
        )
        self.plans.save_schedule_plan(plan)

        schedule_items: list[SchedulePlanItem] = []
        for item in solution.items:
            schedule_items.append(
                SchedulePlanItem(
                    plan_id=plan.plan_id,
                    task_id=item.task_id,
                    device_id=item.device_id,
                    original_device_id=item.original_device_id,
                    start_time=item.start_time,
                    end_time=item.end_time,
                    delay_minutes=item.delay_minutes,
                    item_type="dispatch",
                )
            )
            self.tasks.update_task_assignment(item.task_id, item.device_id, item.start_time, item.end_time)
            self.logs.save_schedule_log(
                ScheduleLog(
                    schedule_time=datetime.now(),
                    plan_id=plan.plan_id,
                    task_id=item.task_id,
                    from_device=item.original_device_id,
                    to_device=item.device_id,
                    reason="health_aware_adaptive_dispatch",
                    operator=operator,
                    detail={
                        "start_time": item.start_time.isoformat(),
                        "end_time": item.end_time.isoformat(),
                        "delay_minutes": item.delay_minutes,
                    },
                )
            )
        self.items.save_schedule_items(schedule_items)
        return plan

    def _health_state(self, device_id: str) -> tuple[float, float]:
        health_cache = self.redis.hgetall(f"device:{device_id}:health")
        if health_cache:
            return (
                _float_value(health_cache.get("health_index"), 100.0),
                _float_value(health_cache.get("rul_minutes"), 9999.0),
            )
        record = self.health.get_latest_health(device_id)
        if record is None:
            return 100.0, 9999.0
        return record.health_index or 100.0, record.rul_minutes or 9999.0

    def _device_current_load(self, device_id: str) -> float:
        cached = self.redis.get(f"dispatch:device:{device_id}:load")
        if cached is not None:
            return _float_value(cached, 0.0)
        return sum((task.duration or 1) * (task.load_weight or 1.0) for task in self.tasks.get_tasks_by_device(device_id))

    def _task_count_by_device(self) -> dict[str, int]:
        output: dict[str, int] = {}
        for task in self.tasks.get_pending_tasks():
            if task.assigned_device:
                output[task.assigned_device] = output.get(task.assigned_device, 0) + 1
        return output

    def _write_redis_dispatch(
        self,
        plan: SchedulePlan,
        items: list[SchedulePlanItem],
        devices: list[DispatchDevice],
    ) -> None:
        by_device: dict[str, list[dict]] = {}
        load_by_device: dict[str, float] = {device.device_id: 0.0 for device in devices}
        task_map = {task.task_id: task for task in self.tasks.get_pending_tasks()}
        for item in items:
            task = task_map.get(item.task_id)
            workload = (task.duration or 1) * (task.load_weight or 1.0) if task is not None else 1.0
            load_by_device[item.device_id] = load_by_device.get(item.device_id, 0.0) + workload
            by_device.setdefault(item.device_id, []).append(
                {
                    "task_id": item.task_id,
                    "start_time": item.start_time.isoformat(),
                    "end_time": item.end_time.isoformat(),
                    "delay_minutes": item.delay_minutes,
                }
            )

        self.redis.set(
            "dispatch:current_plan",
            json.dumps(
                {
                    "plan_id": plan.plan_id,
                    "status": plan.status,
                    "algorithm": plan.algorithm,
                    "health_match_score": plan.health_match_score,
                    "high_risk_load_rate": plan.high_risk_load_rate,
                },
                ensure_ascii=False,
            ),
        )
        for device in devices:
            queue = by_device.get(device.device_id, [])
            self.redis.set(f"dispatch:device:{device.device_id}:queue", json.dumps(queue, ensure_ascii=False))
            self.redis.set(f"dispatch:device:{device.device_id}:load", round(load_by_device.get(device.device_id, 0.0), 4))


def _plan_response(plan: SchedulePlan, items: list[SchedulePlanItem]) -> SchedulePlanResponse:
    response = SchedulePlanResponse.model_validate(plan)
    response.items = [SchedulePlanItemResponse.model_validate(item) for item in items]
    return response


def _float_value(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
