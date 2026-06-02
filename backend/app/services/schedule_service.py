from datetime import datetime
import json

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.optimization.constraint_validator import validate_task_adjustment
from ..models.schedule import ScheduleLog, SchedulePlan, SchedulePlanItem
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.schedule_repository import (
    ScheduleLogRepository,
    SchedulePlanItemRepository,
    SchedulePlanRepository,
)
from ..repositories.task_repository import TaskRepository
from ..schemas.schedule_schema import (
    ScheduleAdjustRequest,
    ScheduleGanttItem,
    ScheduleGanttResponse,
    ScheduleMetricsResponse,
    SchedulePlanItemResponse,
    SchedulePlanResponse,
)


class ScheduleService:
    def __init__(self, db: Session, redis_client: Redis):
        self.redis = redis_client
        self.tasks = TaskRepository(db)
        self.maintenance = MaintenanceRepository(db)
        self.plans = SchedulePlanRepository(db)
        self.items = SchedulePlanItemRepository(db)
        self.logs = ScheduleLogRepository(db)

    def get_current_plan(self) -> SchedulePlanResponse:
        plan = self.plans.get_current_plan("production_maintenance")
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule plan not found")
        return _plan_response(plan, self.items.get_items_by_plan(plan.plan_id))

    def get_gantt_data(self, plan_id: str | None = None) -> ScheduleGanttResponse:
        plan = self._resolve_plan(plan_id)
        items = self.items.get_items_by_plan(plan.plan_id)
        output = [
            ScheduleGanttItem(
                id=f"task-{item.id}",
                plan_id=item.plan_id,
                task_id=item.task_id,
                task_name=self._task_name(item.task_id),
                device_id=item.device_id,
                start_time=item.start_time,
                end_time=item.end_time,
                item_type=item.item_type,
                delay_minutes=item.delay_minutes,
                status="scheduled",
            )
            for item in items
        ]
        for window in self.maintenance.get_active_windows():
            if window.plan_start_time is None or window.plan_end_time is None:
                continue
            output.append(
                ScheduleGanttItem(
                    id=f"maintenance-{window.plan_id}",
                    plan_id=plan.plan_id,
                    task_id=None,
                    task_name=window.maintenance_type,
                    device_id=window.device_id,
                    start_time=window.plan_start_time,
                    end_time=window.plan_end_time,
                    item_type="maintenance",
                    delay_minutes=0,
                    status=window.status,
                )
            )
        output.sort(key=lambda item: (item.device_id, item.start_time))
        return ScheduleGanttResponse(plan_id=plan.plan_id, items=output)

    def adjust_task(self, payload: ScheduleAdjustRequest, operator: str | None = None) -> SchedulePlanItemResponse:
        item = self.items.get_item_by_plan_and_task(payload.plan_id, payload.task_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule item not found")

        maintenance_windows = [
            (window.device_id, window.plan_start_time, window.plan_end_time)
            for window in self.maintenance.get_active_windows()
            if window.plan_start_time is not None and window.plan_end_time is not None
        ]
        scheduled_items = [
            (value.task_id, value.device_id, value.start_time, value.end_time)
            for value in self.items.get_items_by_plan(payload.plan_id)
        ]
        is_valid, message = validate_task_adjustment(
            device_id=payload.device_id,
            start_time=payload.start_time,
            end_time=payload.end_time,
            maintenance_windows=maintenance_windows,
            scheduled_items=scheduled_items,
            ignore_task_id=payload.task_id,
        )
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

        original_device = item.device_id
        delay = _delay_minutes(payload.end_time, self.tasks.get(payload.task_id).due_time if self.tasks.get(payload.task_id) else None)
        self.items.update_item(
            item,
            device_id=payload.device_id,
            start_time=payload.start_time,
            end_time=payload.end_time,
            delay_minutes=delay,
            is_adjusted=1,
        )
        self.tasks.update_task_assignment(payload.task_id, payload.device_id, payload.start_time, payload.end_time)
        self.logs.save_schedule_log(
            ScheduleLog(
                schedule_time=datetime.now(),
                plan_id=payload.plan_id,
                task_id=payload.task_id,
                from_device=original_device,
                to_device=payload.device_id,
                reason="manual_schedule_adjustment",
                operator=operator,
                detail={
                    "start_time": payload.start_time.isoformat(),
                    "end_time": payload.end_time.isoformat(),
                    "delay_minutes": delay,
                },
            )
        )
        self._refresh_plan_metrics(payload.plan_id)
        self._cache_current_plan(payload.plan_id)
        return SchedulePlanItemResponse.model_validate(item)

    def confirm_plan(self, plan_id: str, operator: str | None = None) -> SchedulePlanResponse:
        plan = self.plans.update_plan(plan_id, status="confirmed", confirmed_by=operator, confirmed_time=datetime.now())
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule plan not found")
        self._cache_current_plan(plan_id)
        return _plan_response(plan, self.items.get_items_by_plan(plan_id))

    def get_metrics(self, plan_id: str | None = None) -> ScheduleMetricsResponse:
        plan = self._resolve_plan(plan_id)
        return ScheduleMetricsResponse(
            plan_id=plan.plan_id,
            total_delay=plan.total_delay,
            makespan=plan.makespan,
            avg_load_rate=plan.avg_load_rate,
            load_balance_score=plan.load_balance_score,
            high_risk_load_rate=plan.high_risk_load_rate,
        )

    def _resolve_plan(self, plan_id: str | None) -> SchedulePlan:
        plan = self.plans.get(plan_id) if plan_id else self.plans.get_current_plan("production_maintenance")
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule plan not found")
        return plan

    def _task_name(self, task_id: str) -> str | None:
        task = self.tasks.get(task_id)
        return task.task_name if task is not None else None

    def _refresh_plan_metrics(self, plan_id: str) -> None:
        plan = self.plans.get(plan_id)
        if plan is None:
            return
        items = self.items.get_items_by_plan(plan_id)
        if not items:
            return
        start = min(item.start_time for item in items)
        end = max(item.end_time for item in items)
        makespan = max(0, round((end - start).total_seconds() / 60))
        total_delay = sum(item.delay_minutes for item in items)
        device_ids = {item.device_id for item in items}
        total_work = sum(max(1, round((item.end_time - item.start_time).total_seconds() / 60)) for item in items)
        avg_load_rate = round(total_work / max(makespan * max(len(device_ids), 1), 1), 4)
        self.plans.update_plan(plan_id, total_delay=total_delay, makespan=makespan, avg_load_rate=avg_load_rate)

    def _cache_current_plan(self, plan_id: str) -> None:
        plan = self.plans.get(plan_id)
        if plan is None:
            return
        items = self.items.get_items_by_plan(plan_id)
        self.redis.set(
            "schedule:current_plan",
            json.dumps(
                {
                    "plan_id": plan.plan_id,
                    "status": plan.status,
                    "total_delay": plan.total_delay,
                    "items": [
                        {
                            "task_id": item.task_id,
                            "device_id": item.device_id,
                            "start_time": item.start_time.isoformat(),
                            "end_time": item.end_time.isoformat(),
                        }
                        for item in items
                    ],
                },
                ensure_ascii=False,
            ),
        )


def _plan_response(plan: SchedulePlan, items: list[SchedulePlanItem]) -> SchedulePlanResponse:
    response = SchedulePlanResponse.model_validate(plan)
    response.items = [SchedulePlanItemResponse.model_validate(item) for item in items]
    return response


def _delay_minutes(end_time: datetime, due_time: datetime | None) -> int:
    if due_time is None:
        return 0
    return max(0, round((end_time - due_time).total_seconds() / 60))
