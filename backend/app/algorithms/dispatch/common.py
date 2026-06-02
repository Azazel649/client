from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DispatchDevice:
    device_id: str
    device_type: str | None
    status: str
    health_index: float
    rul_minutes: float
    current_load: float = 0.0
    max_load_rate: float = 1.0


@dataclass(frozen=True)
class DispatchTask:
    task_id: str
    task_name: str
    required_device_type: str | None
    duration: int
    priority: int
    load_weight: float
    due_time: datetime | None
    predecessor_task_id: str | None = None
    assigned_device: str | None = None


@dataclass(frozen=True)
class DispatchItem:
    task_id: str
    device_id: str
    start_time: datetime
    end_time: datetime
    delay_minutes: int
    original_device_id: str | None = None


@dataclass(frozen=True)
class DispatchMetrics:
    total_delay: int
    makespan: int
    avg_load_rate: float
    load_balance_score: float
    health_match_score: float
    high_risk_load_rate: float


@dataclass(frozen=True)
class DispatchSolution:
    feasible: bool
    items: list[DispatchItem]
    metrics: DispatchMetrics
    assignment: dict[str, str]
    message: str = "ok"


def compatible_devices(task: DispatchTask, devices: list[DispatchDevice]) -> list[DispatchDevice]:
    matched = [device for device in devices if task.required_device_type and device.device_type == task.required_device_type]
    if matched:
        return matched
    return devices


def is_device_available(device: DispatchDevice, min_health_index: float = 30.0) -> bool:
    blocked = {"fault", "locked", "maintenance", "offline", "disabled"}
    return device.status not in blocked and device.health_index >= min_health_index


def task_workload(task: DispatchTask) -> float:
    return max(task.duration, 1) * max(task.load_weight, 0.1)
