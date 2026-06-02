from datetime import datetime
import json

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.dispatch.common import DispatchDevice, DispatchTask
from ..algorithms.transfer.transfer_optimizer import ExistingDeviceQueue, TransferOptimizer, TransferPlan
from ..models.schedule import ScheduleLog
from ..repositories.device_repository import DeviceRepository
from ..repositories.health_repository import HealthRepository
from ..repositories.schedule_repository import ScheduleLogRepository
from ..repositories.task_repository import TaskRepository
from ..schemas.transfer_schema import (
    TransferExecuteResponse,
    TransferItemResponse,
    TransferMetricsResponse,
    TransferPlanRequest,
    TransferPlanResponse,
)


class TaskTransferService:
    def __init__(self, db: Session, redis_client: Redis):
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.health = HealthRepository(db)
        self.tasks = TaskRepository(db)
        self.logs = ScheduleLogRepository(db)

    def generate_transfer_plan(self, device_id: str, payload: TransferPlanRequest) -> TransferPlanResponse:
        anomaly_device = self.devices.get_by_id(device_id)
        if anomaly_device is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="device not found")
        self.devices.update_status(device_id, "locked")

        transfer_tasks = self._tasks_from_device(device_id)
        devices = self._dispatch_devices()
        queues = self._existing_queues(device_id)
        plan = TransferOptimizer(
            min_healthy_hi=payload.min_healthy_hi,
            population_size=payload.population_size,
            max_generation=payload.max_generation,
            mutation_rate=payload.mutation_rate,
        ).optimize(device_id, transfer_tasks, devices, queues, datetime.now())
        self._cache_plan(plan)
        return _plan_response(plan)

    def get_cached_transfer_plan(self, device_id: str) -> TransferPlanResponse:
        cached = self.redis.get(f"transfer:plan:{device_id}")
        if cached is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="transfer plan not found")
        return TransferPlanResponse.model_validate(json.loads(cached))

    def execute_transfer(self, device_id: str, operator: str | None = None) -> TransferExecuteResponse:
        response = self.get_cached_transfer_plan(device_id)
        if not response.feasible:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=response.message)
        executed_at = datetime.now()
        for item in response.items:
            self.tasks.update_task_assignment(item.task_id, item.to_device, item.start_time, item.end_time)
            self.logs.save_schedule_log(
                ScheduleLog(
                    schedule_time=executed_at,
                    plan_id=None,
                    task_id=item.task_id,
                    from_device=item.from_device,
                    to_device=item.to_device,
                    reason="hi_drop_task_transfer",
                    operator=operator,
                    detail={
                        "start_time": item.start_time.isoformat(),
                        "end_time": item.end_time.isoformat(),
                        "delay_minutes": item.delay_minutes,
                    },
                )
            )
        self._refresh_redis_queues()
        self.redis.delete(f"transfer:plan:{device_id}")
        self.redis.hset(f"device:{device_id}:alert", mapping={"transfer_executed_at": executed_at.isoformat()})
        return TransferExecuteResponse(
            device_id=device_id,
            transferred_tasks=len(response.items),
            executed_at=executed_at,
            message="transfer executed",
        )

    def _tasks_from_device(self, device_id: str) -> list[DispatchTask]:
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
            for task in self.tasks.get_unfinished_tasks(device_id)
        ]

    def _dispatch_devices(self) -> list[DispatchDevice]:
        output: list[DispatchDevice] = []
        for device in self.devices.get_all_devices():
            hi, rul = self._health_state(device.device_id)
            output.append(
                DispatchDevice(
                    device_id=device.device_id,
                    device_type=device.device_type,
                    status=device.status,
                    health_index=hi,
                    rul_minutes=rul,
                    current_load=self._device_current_load(device.device_id),
                    max_load_rate=device.max_load_rate or 1.0,
                )
            )
        return output

    def _existing_queues(self, anomaly_device_id: str) -> list[ExistingDeviceQueue]:
        now = datetime.now()
        queues: list[ExistingDeviceQueue] = []
        for device in self.devices.get_all_devices():
            if device.device_id == anomaly_device_id:
                continue
            tasks = self.tasks.get_unfinished_tasks(device.device_id)
            available_at = max([task.end_time for task in tasks if task.end_time is not None], default=now)
            load = sum((task.duration or 1) * (task.load_weight or 1.0) for task in tasks)
            queues.append(ExistingDeviceQueue(device.device_id, max(now, available_at), load))
        return queues

    def _health_state(self, device_id: str) -> tuple[float, float]:
        health_cache = self.redis.hgetall(f"device:{device_id}:health")
        if health_cache:
            return _float_value(health_cache.get("health_index"), 100.0), _float_value(health_cache.get("rul_minutes"), 9999.0)
        record = self.health.get_latest_health(device_id)
        if record is None:
            return 100.0, 9999.0
        return record.health_index or 100.0, record.rul_minutes or 9999.0

    def _device_current_load(self, device_id: str) -> float:
        cached = self.redis.get(f"dispatch:device:{device_id}:load")
        if cached is not None:
            return _float_value(cached, 0.0)
        return sum((task.duration or 1) * (task.load_weight or 1.0) for task in self.tasks.get_unfinished_tasks(device_id))

    def _cache_plan(self, plan: TransferPlan) -> None:
        self.redis.set(f"transfer:plan:{plan.anomaly_device_id}", _plan_response(plan).model_dump_json())

    def _refresh_redis_queues(self) -> None:
        for device in self.devices.get_all_devices():
            tasks = self.tasks.get_unfinished_tasks(device.device_id)
            queue = [
                {
                    "task_id": task.task_id,
                    "start_time": task.start_time.isoformat() if task.start_time else None,
                    "end_time": task.end_time.isoformat() if task.end_time else None,
                }
                for task in tasks
            ]
            load = sum((task.duration or 1) * (task.load_weight or 1.0) for task in tasks)
            self.redis.set(f"dispatch:device:{device.device_id}:queue", json.dumps(queue, ensure_ascii=False))
            self.redis.set(f"dispatch:device:{device.device_id}:load", round(load, 4))


def _plan_response(plan: TransferPlan) -> TransferPlanResponse:
    return TransferPlanResponse(
        feasible=plan.feasible,
        anomaly_device_id=plan.anomaly_device_id,
        items=[
            TransferItemResponse(
                task_id=item.task_id,
                from_device=item.from_device,
                to_device=item.to_device,
                start_time=item.start_time,
                end_time=item.end_time,
                delay_minutes=item.delay_minutes,
            )
            for item in plan.items
        ],
        metrics=TransferMetricsResponse(
            total_delay=plan.metrics.total_delay,
            makespan=plan.metrics.makespan,
            load_balance_score=plan.metrics.load_balance_score,
            high_risk_load_rate=plan.metrics.high_risk_load_rate,
        ),
        message=plan.message,
    )


def _float_value(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
