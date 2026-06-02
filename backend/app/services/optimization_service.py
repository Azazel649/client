from datetime import datetime
import json
from uuid import uuid4

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.optimization.pulp_model_builder import (
    DeviceInput,
    MaintenanceWindowInput,
    TaskInput,
    build_linear_program,
)
from ..algorithms.optimization.pulp_solver import ScheduleSolution, solve_linear_program
from ..models.schedule import ScheduleLog, SchedulePlan, SchedulePlanItem
from ..repositories.device_repository import DeviceRepository
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.schedule_repository import (
    ScheduleLogRepository,
    SchedulePlanItemRepository,
    SchedulePlanRepository,
)
from ..repositories.task_repository import TaskRepository
from ..schemas.schedule_schema import ScheduleOptimizeRequest, SchedulePlanItemResponse, SchedulePlanResponse


class OptimizationService:
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.tasks = TaskRepository(db)
        self.maintenance = MaintenanceRepository(db)
        self.plans = SchedulePlanRepository(db)
        self.items = SchedulePlanItemRepository(db)
        self.logs = ScheduleLogRepository(db)

    def optimize(self, payload: ScheduleOptimizeRequest, operator: str | None = None) -> SchedulePlanResponse:
        now = datetime.now()
        devices = self._device_inputs()
        tasks = self._task_inputs()
        windows = self._maintenance_inputs()
        if not tasks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no schedulable production task")

        problem = build_linear_program(devices=devices, tasks=tasks, maintenance_windows=windows, now=now)
        solution = solve_linear_program(problem)
        if not solution.feasible:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=solution.message)

        plan = self._save_solution(payload, solution, windows, operator)
        plan_items = self.items.get_items_by_plan(plan.plan_id)
        self._cache_current_plan(plan, plan_items)
        return _plan_response(plan, plan_items)

    def _device_inputs(self) -> list[DeviceInput]:
        return [
            DeviceInput(
                device_id=device.device_id,
                device_type=device.device_type,
                status=device.status,
                max_load_rate=device.max_load_rate or 1.0,
            )
            for device in self.devices.get_all_devices()
        ]

    def _task_inputs(self) -> list[TaskInput]:
        return [
            TaskInput(
                task_id=task.task_id,
                task_name=task.task_name,
                required_device_type=task.required_device_type,
                duration=task.duration or 1,
                priority=task.priority or 0,
                load_weight=task.load_weight or 1.0,
                predecessor_task_id=task.predecessor_task_id,
                due_time=task.due_time,
                assigned_device=task.assigned_device,
                start_time=task.start_time,
                end_time=task.end_time,
            )
            for task in self.tasks.get_pending_tasks()
        ]

    def _maintenance_inputs(self) -> list[MaintenanceWindowInput]:
        output: list[MaintenanceWindowInput] = []
        for plan in self.maintenance.get_active_windows():
            if plan.plan_start_time is None or plan.plan_end_time is None:
                continue
            output.append(
                MaintenanceWindowInput(
                    plan_id=plan.plan_id,
                    device_id=plan.device_id,
                    start_time=plan.plan_start_time,
                    end_time=plan.plan_end_time,
                )
            )
        return output

    def _save_solution(
        self,
        payload: ScheduleOptimizeRequest,
        solution: ScheduleSolution,
        windows: list[MaintenanceWindowInput],
        operator: str | None,
    ) -> SchedulePlan:
        plan = SchedulePlan(
            plan_id=uuid4().hex,
            plan_type="production_maintenance",
            plan_name=payload.plan_name or f"schedule-{datetime.now():%Y%m%d%H%M%S}",
            total_delay=solution.total_delay,
            makespan=solution.makespan,
            avg_load_rate=solution.avg_load_rate,
            load_balance_score=solution.load_balance_score,
            health_match_score=1.0,
            high_risk_load_rate=_high_risk_load_rate(solution, windows),
            status="draft" if payload.save_as_draft else "confirmed",
            algorithm="pulp_cbc_milp",
            confirmed_by=None if payload.save_as_draft else operator,
            confirmed_time=None if payload.save_as_draft else datetime.now(),
            remark="solved by PuLP CBC MILP with maintenance windows as occupied intervals",
        )
        self.plans.save_schedule_plan(plan)

        items: list[SchedulePlanItem] = []
        for scheduled in solution.items:
            task = self.tasks.get(scheduled.task_id)
            original_device = task.assigned_device if task is not None else None
            items.append(
                SchedulePlanItem(
                    plan_id=plan.plan_id,
                    task_id=scheduled.task_id,
                    device_id=scheduled.device_id,
                    original_device_id=original_device,
                    start_time=scheduled.start_time,
                    end_time=scheduled.end_time,
                    delay_minutes=scheduled.delay_minutes,
                    item_type="production",
                )
            )
            self.tasks.update_task_assignment(
                scheduled.task_id,
                scheduled.device_id,
                start_time=scheduled.start_time,
                end_time=scheduled.end_time,
            )
            self.logs.save_schedule_log(
                ScheduleLog(
                    schedule_time=datetime.now(),
                    plan_id=plan.plan_id,
                    task_id=scheduled.task_id,
                    from_device=original_device,
                    to_device=scheduled.device_id,
                    reason="production_maintenance_optimization",
                    operator=operator,
                    detail={
                        "start_time": scheduled.start_time.isoformat(),
                        "end_time": scheduled.end_time.isoformat(),
                        "delay_minutes": scheduled.delay_minutes,
                    },
                )
            )
        self.items.save_schedule_items(items)
        return plan

    def _cache_current_plan(self, plan: SchedulePlan, items: list[SchedulePlanItem]) -> None:
        payload = {
            "plan_id": plan.plan_id,
            "plan_type": plan.plan_type,
            "status": plan.status,
            "total_delay": plan.total_delay,
            "makespan": plan.makespan,
            "items": [
                {
                    "task_id": item.task_id,
                    "device_id": item.device_id,
                    "start_time": item.start_time.isoformat(),
                    "end_time": item.end_time.isoformat(),
                    "delay_minutes": item.delay_minutes,
                }
                for item in items
            ],
        }
        self.redis.set("schedule:current_plan", json.dumps(payload, ensure_ascii=False))


def _high_risk_load_rate(solution: ScheduleSolution, windows: list[MaintenanceWindowInput]) -> float:
    risky_devices = {window.device_id for window in windows}
    if not solution.items:
        return 0.0
    total_minutes = sum(max(1, round((item.end_time - item.start_time).total_seconds() / 60)) for item in solution.items)
    risky_minutes = sum(
        max(1, round((item.end_time - item.start_time).total_seconds() / 60))
        for item in solution.items
        if item.device_id in risky_devices
    )
    return round(risky_minutes / max(total_minutes, 1), 4)


def _plan_response(plan: SchedulePlan, items: list[SchedulePlanItem]) -> SchedulePlanResponse:
    response = SchedulePlanResponse.model_validate(plan)
    response.items = [SchedulePlanItemResponse.model_validate(item) for item in items]
    return response
