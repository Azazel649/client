from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import pstdev

import pulp

from .pulp_model_builder import SchedulingProblem, TaskInput


@dataclass(frozen=True)
class ScheduledTask:
    task_id: str
    device_id: str
    start_time: datetime
    end_time: datetime
    delay_minutes: int


@dataclass(frozen=True)
class ScheduleSolution:
    feasible: bool
    items: list[ScheduledTask]
    total_delay: int
    makespan: int
    avg_load_rate: float
    load_balance_score: float
    message: str = "ok"


def solve_linear_program(problem: SchedulingProblem) -> ScheduleSolution:
    solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=30)
    status_code = problem.model.solve(solver)
    status_name = pulp.LpStatus.get(status_code, "Unknown")
    if status_name not in {"Optimal", "Feasible"}:
        return ScheduleSolution(False, [], 0, 0, 0, 0, f"PuLP solver status: {status_name}")

    task_map = {task.task_id: task for task in problem.tasks}
    scheduled: list[ScheduledTask] = []
    load_minutes: dict[str, int] = {}
    for task in problem.tasks:
        task_id = task.task_id
        device_id = _selected_device(task_id, problem)
        if device_id is None:
            return ScheduleSolution(False, [], 0, 0, 0, 0, f"task {task_id} has no selected device")
        start_minutes = round(pulp.value(problem.start_vars[task_id]) or 0)
        end_minutes = round(pulp.value(problem.end_vars[task_id]) or start_minutes + max(task.duration, 1))
        delay_minutes = round(pulp.value(problem.delay_vars[task_id]) or 0)
        load_minutes[device_id] = load_minutes.get(device_id, 0) + max(_task_duration(task_map[task_id]), 1)
        scheduled.append(
            ScheduledTask(
                task_id=task_id,
                device_id=device_id,
                start_time=problem.now + timedelta(minutes=start_minutes),
                end_time=problem.now + timedelta(minutes=end_minutes),
                delay_minutes=delay_minutes,
            )
        )

    scheduled.sort(key=lambda item: (item.device_id, item.start_time, item.task_id))
    total_delay = sum(item.delay_minutes for item in scheduled)
    makespan = round(pulp.value(problem.makespan_var) or 0) if problem.makespan_var is not None else _makespan(scheduled)
    active_devices = [device.device_id for device in problem.devices if device.status in {"running", "idle"}]
    loads = [load_minutes.get(device_id, 0) for device_id in active_devices]
    available_minutes = max(makespan, 1) * max(len(active_devices), 1)
    avg_load_rate = round(sum(loads) / available_minutes, 4)
    load_balance_score = round(pstdev(loads), 4) if len(loads) > 1 else 0.0
    return ScheduleSolution(True, scheduled, total_delay, makespan, avg_load_rate, load_balance_score, f"PuLP solver status: {status_name}")


def _selected_device(task_id: str, problem: SchedulingProblem) -> str | None:
    best_device_id: str | None = None
    best_value = 0.0
    for device in problem.devices:
        key = (task_id, device.device_id)
        if key not in problem.assignment_vars:
            continue
        value = pulp.value(problem.assignment_vars[key]) or 0.0
        if value > best_value:
            best_value = value
            best_device_id = device.device_id
    return best_device_id if best_value >= 0.5 else None


def _task_duration(task: TaskInput) -> int:
    return max(task.duration, 1)


def _makespan(items: list[ScheduledTask]) -> int:
    if not items:
        return 0
    start = min(item.start_time for item in items)
    end = max(item.end_time for item in items)
    return max(0, round((end - start).total_seconds() / 60))
