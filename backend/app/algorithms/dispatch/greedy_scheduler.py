from datetime import datetime, timedelta
from statistics import pstdev

from .common import (
    DispatchDevice,
    DispatchItem,
    DispatchMetrics,
    DispatchSolution,
    DispatchTask,
    compatible_devices,
    is_device_available,
    task_workload,
)


class GreedyScheduler:
    def __init__(self, min_health_index: float = 30.0):
        self.min_health_index = min_health_index

    def schedule(self, tasks: list[DispatchTask], devices: list[DispatchDevice], now: datetime) -> DispatchSolution:
        available_devices = [device for device in devices if is_device_available(device, self.min_health_index)]
        if not available_devices and tasks:
            return _empty_solution(False, "no healthy available device")

        assignment: dict[str, str] = {}
        device_load = {device.device_id: max(device.current_load, 0.0) for device in available_devices}
        sorted_tasks = sorted(tasks, key=lambda task: (-task.priority, -task_workload(task), task.due_time or datetime.max, task.task_id))
        for task in sorted_tasks:
            candidates = compatible_devices(task, available_devices)
            if not candidates:
                return _empty_solution(False, f"task {task.task_id} has no compatible device")
            best_device = min(candidates, key=lambda device: (_load_health_ratio(device_load[device.device_id], device), device.device_id))
            assignment[task.task_id] = best_device.device_id
            device_load[best_device.device_id] += task_workload(task)

        return build_dispatch_solution(tasks, available_devices, assignment, now)


def build_dispatch_solution(
    tasks: list[DispatchTask],
    devices: list[DispatchDevice],
    assignment: dict[str, str],
    now: datetime,
) -> DispatchSolution:
    device_map = {device.device_id: device for device in devices}
    task_map = {task.task_id: task for task in tasks}
    device_available_at = {device.device_id: now for device in devices}
    device_load = {device.device_id: max(device.current_load, 0.0) for device in devices}
    scheduled_end: dict[str, datetime] = {}
    items: list[DispatchItem] = []

    for task in _ordered_tasks(tasks):
        device_id = assignment.get(task.task_id)
        if device_id not in device_map:
            return _empty_solution(False, f"task {task.task_id} is assigned to unavailable device")
        device = device_map[device_id]
        if device not in compatible_devices(task, devices):
            return _empty_solution(False, f"task {task.task_id} violates device capability constraint")

        start_time = device_available_at[device_id]
        if task.predecessor_task_id and task.predecessor_task_id in scheduled_end:
            start_time = max(start_time, scheduled_end[task.predecessor_task_id])
        end_time = start_time + timedelta(minutes=max(task.duration, 1))
        delay = _delay_minutes(end_time, task.due_time)
        items.append(
            DispatchItem(
                task_id=task.task_id,
                device_id=device_id,
                start_time=start_time,
                end_time=end_time,
                delay_minutes=delay,
                original_device_id=task.assigned_device,
            )
        )
        scheduled_end[task.task_id] = end_time
        device_available_at[device_id] = end_time
        device_load[device_id] += task_workload(task)

    metrics = _metrics(items, devices, task_map, now, device_load)
    return DispatchSolution(True, items, metrics, assignment, "ok")


def _ordered_tasks(tasks: list[DispatchTask]) -> list[DispatchTask]:
    task_map = {task.task_id: task for task in tasks}
    ordered: list[DispatchTask] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(task: DispatchTask) -> None:
        if task.task_id in visited or task.task_id in visiting:
            return
        visiting.add(task.task_id)
        predecessor = task.predecessor_task_id
        if predecessor and predecessor in task_map:
            visit(task_map[predecessor])
        visiting.remove(task.task_id)
        visited.add(task.task_id)
        ordered.append(task)

    for task in sorted(tasks, key=lambda item: (-item.priority, -task_workload(item), item.due_time or datetime.max, item.task_id)):
        visit(task)
    return ordered


def _metrics(
    items: list[DispatchItem],
    devices: list[DispatchDevice],
    task_map: dict[str, DispatchTask],
    now: datetime,
    device_load: dict[str, float],
) -> DispatchMetrics:
    if not items:
        return DispatchMetrics(0, 0, 0.0, 0.0, 1.0, 0.0)
    makespan = max(0, round((max(item.end_time for item in items) - now).total_seconds() / 60))
    total_work = sum(task_workload(task_map[item.task_id]) for item in items)
    load_values = [device_load.get(device.device_id, 0.0) for device in devices]
    avg_load_rate = round(total_work / max(makespan * max(len(devices), 1), 1), 4)
    load_balance = round(pstdev(load_values), 4) if len(load_values) > 1 else 0.0
    ratios = [_load_health_ratio(device_load.get(device.device_id, 0.0), device) for device in devices]
    health_match_deviation = round(pstdev(ratios), 4) if len(ratios) > 1 else 0.0
    high_risk_work = sum(task_workload(task_map[item.task_id]) for item in items if _device_health(item.device_id, devices) < 30)
    high_risk_rate = round(high_risk_work / max(total_work, 1), 4)
    health_match_score = round(1 / (1 + health_match_deviation), 4)
    return DispatchMetrics(
        total_delay=sum(item.delay_minutes for item in items),
        makespan=makespan,
        avg_load_rate=avg_load_rate,
        load_balance_score=load_balance,
        health_match_score=health_match_score,
        high_risk_load_rate=high_risk_rate,
    )


def _load_health_ratio(load: float, device: DispatchDevice) -> float:
    health_capacity = max(device.health_index, 1.0) * max(device.max_load_rate, 0.1)
    rul_factor = max(min(device.rul_minutes / 480, 1.0), 0.25) if device.rul_minutes else 0.25
    return load / max(health_capacity * rul_factor, 1.0)


def _device_health(device_id: str, devices: list[DispatchDevice]) -> float:
    for device in devices:
        if device.device_id == device_id:
            return device.health_index
    return 0.0


def _delay_minutes(end_time: datetime, due_time: datetime | None) -> int:
    if due_time is None:
        return 0
    return max(0, round((end_time - due_time).total_seconds() / 60))


def _empty_solution(feasible: bool, message: str) -> DispatchSolution:
    return DispatchSolution(False, [], DispatchMetrics(0, 0, 0.0, 0.0, 0.0, 0.0), {}, message)
