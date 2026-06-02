from dataclasses import dataclass, field
from datetime import datetime

import pulp


@dataclass(frozen=True)
class DeviceInput:
    device_id: str
    device_type: str | None
    status: str
    max_load_rate: float


@dataclass(frozen=True)
class TaskInput:
    task_id: str
    task_name: str
    required_device_type: str | None
    duration: int
    priority: int
    load_weight: float
    predecessor_task_id: str | None
    due_time: datetime | None
    assigned_device: str | None
    start_time: datetime | None
    end_time: datetime | None


@dataclass(frozen=True)
class MaintenanceWindowInput:
    plan_id: str
    device_id: str
    start_time: datetime
    end_time: datetime


@dataclass(frozen=True)
class SchedulingProblem:
    now: datetime
    devices: list[DeviceInput]
    tasks: list[TaskInput]
    maintenance_windows: list[MaintenanceWindowInput]
    model: pulp.LpProblem
    assignment_vars: dict[tuple[str, str], pulp.LpVariable] = field(default_factory=dict)
    start_vars: dict[str, pulp.LpVariable] = field(default_factory=dict)
    end_vars: dict[str, pulp.LpVariable] = field(default_factory=dict)
    delay_vars: dict[str, pulp.LpVariable] = field(default_factory=dict)
    makespan_var: pulp.LpVariable | None = None


def build_linear_program(
    devices: list[DeviceInput],
    tasks: list[TaskInput],
    maintenance_windows: list[MaintenanceWindowInput],
    now: datetime,
) -> SchedulingProblem:
    available_devices = [device for device in devices if device.status in {"running", "idle"}]
    model = pulp.LpProblem("production_maintenance_integrated_scheduling", pulp.LpMinimize)

    assignment_vars = {
        (task.task_id, device.device_id): pulp.LpVariable(f"x_{task.task_id}_{device.device_id}", cat=pulp.LpBinary)
        for task in tasks
        for device in available_devices
    }
    start_vars = {task.task_id: pulp.LpVariable(f"start_{task.task_id}", lowBound=0) for task in tasks}
    end_vars = {task.task_id: pulp.LpVariable(f"end_{task.task_id}", lowBound=0) for task in tasks}
    delay_vars = {task.task_id: pulp.LpVariable(f"delay_{task.task_id}", lowBound=0) for task in tasks}
    makespan_var = pulp.LpVariable("makespan", lowBound=0)

    if not available_devices and tasks:
        infeasible_var = pulp.LpVariable("no_available_device_marker", lowBound=0, upBound=0)
        model += infeasible_var >= 1, "no_available_device"
        return SchedulingProblem(now, devices, tasks, maintenance_windows, model, assignment_vars, start_vars, end_vars, delay_vars, makespan_var)

    horizon = _horizon_minutes(now, tasks, maintenance_windows)
    big_m = horizon + sum(max(task.duration, 1) for task in tasks) + 1440

    for task in tasks:
        duration = max(task.duration, 1)
        task_key = task.task_id
        model += end_vars[task_key] == start_vars[task_key] + duration, f"duration_{task_key}"
        model += makespan_var >= end_vars[task_key], f"makespan_{task_key}"
        if task.due_time is not None:
            model += delay_vars[task_key] >= end_vars[task_key] - _minute_offset(now, task.due_time), f"delay_{task_key}"

        candidates = _candidate_devices(task, available_devices)
        model += pulp.lpSum(assignment_vars[(task_key, device.device_id)] for device in available_devices) == 1, f"assign_{task_key}"
        for device in available_devices:
            if device not in candidates:
                model += assignment_vars[(task_key, device.device_id)] == 0, f"compatible_{task_key}_{device.device_id}"

    task_map = {task.task_id: task for task in tasks}
    for task in tasks:
        if task.predecessor_task_id and task.predecessor_task_id in task_map:
            model += start_vars[task.task_id] >= end_vars[task.predecessor_task_id], f"precedence_{task.predecessor_task_id}_{task.task_id}"

    _add_task_non_overlap_constraints(model, tasks, available_devices, assignment_vars, start_vars, end_vars, big_m)
    _add_maintenance_constraints(model, now, tasks, maintenance_windows, assignment_vars, start_vars, end_vars, big_m)
    _add_objective(model, tasks, available_devices, assignment_vars, delay_vars, makespan_var)

    return SchedulingProblem(now, devices, tasks, maintenance_windows, model, assignment_vars, start_vars, end_vars, delay_vars, makespan_var)


def _add_task_non_overlap_constraints(
    model: pulp.LpProblem,
    tasks: list[TaskInput],
    devices: list[DeviceInput],
    assignment_vars: dict[tuple[str, str], pulp.LpVariable],
    start_vars: dict[str, pulp.LpVariable],
    end_vars: dict[str, pulp.LpVariable],
    big_m: int,
) -> None:
    for index, left in enumerate(tasks):
        for right in tasks[index + 1 :]:
            for device in devices:
                device_id = device.device_id
                order_var = pulp.LpVariable(f"order_{left.task_id}_{right.task_id}_{device_id}", cat=pulp.LpBinary)
                both_assigned_slack = 2 - assignment_vars[(left.task_id, device_id)] - assignment_vars[(right.task_id, device_id)]
                model += (
                    end_vars[left.task_id] <= start_vars[right.task_id] + big_m * (1 - order_var) + big_m * both_assigned_slack
                ), f"task_order_left_{left.task_id}_{right.task_id}_{device_id}"
                model += (
                    end_vars[right.task_id] <= start_vars[left.task_id] + big_m * order_var + big_m * both_assigned_slack
                ), f"task_order_right_{left.task_id}_{right.task_id}_{device_id}"


def _add_maintenance_constraints(
    model: pulp.LpProblem,
    now: datetime,
    tasks: list[TaskInput],
    windows: list[MaintenanceWindowInput],
    assignment_vars: dict[tuple[str, str], pulp.LpVariable],
    start_vars: dict[str, pulp.LpVariable],
    end_vars: dict[str, pulp.LpVariable],
    big_m: int,
) -> None:
    for task in tasks:
        for window in windows:
            key = (task.task_id, window.device_id)
            if key not in assignment_vars:
                continue
            window_start = max(0, _minute_offset(now, window.start_time))
            window_end = max(0, _minute_offset(now, window.end_time))
            if window_end <= 0 or window_end <= window_start:
                continue
            before_var = pulp.LpVariable(f"before_maintenance_{task.task_id}_{window.plan_id}", cat=pulp.LpBinary)
            model += (
                end_vars[task.task_id] <= window_start + big_m * (1 - before_var) + big_m * (1 - assignment_vars[key])
            ), f"maintenance_before_{task.task_id}_{window.plan_id}"
            model += (
                start_vars[task.task_id] >= window_end - big_m * before_var - big_m * (1 - assignment_vars[key])
            ), f"maintenance_after_{task.task_id}_{window.plan_id}"


def _add_objective(
    model: pulp.LpProblem,
    tasks: list[TaskInput],
    devices: list[DeviceInput],
    assignment_vars: dict[tuple[str, str], pulp.LpVariable],
    delay_vars: dict[str, pulp.LpVariable],
    makespan_var: pulp.LpVariable,
) -> None:
    weighted_delay = pulp.lpSum(delay_vars[task.task_id] * max(task.priority, 1) for task in tasks)
    assignment_change_penalty = pulp.lpSum(
        10 * (1 - assignment_vars[(task.task_id, task.assigned_device)])
        for task in tasks
        if task.assigned_device and (task.task_id, task.assigned_device) in assignment_vars
    )

    total_weighted_work = sum(max(task.duration, 1) * max(task.load_weight, 0.1) for task in tasks)
    avg_load = total_weighted_work / max(len(devices), 1)
    load_deviation_terms = []
    for device in devices:
        device_id = device.device_id
        load_var = pulp.lpSum(
            max(task.duration, 1) * max(task.load_weight, 0.1) * assignment_vars[(task.task_id, device_id)]
            for task in tasks
        )
        deviation = pulp.LpVariable(f"load_deviation_{device_id}", lowBound=0)
        model += deviation >= load_var - avg_load, f"load_dev_upper_{device_id}"
        model += deviation >= avg_load - load_var, f"load_dev_lower_{device_id}"
        load_deviation_terms.append(deviation)

    model += weighted_delay + 0.05 * makespan_var + 0.2 * pulp.lpSum(load_deviation_terms) + assignment_change_penalty


def _candidate_devices(task: TaskInput, devices: list[DeviceInput]) -> list[DeviceInput]:
    if task.required_device_type:
        matched = [device for device in devices if device.device_type == task.required_device_type]
        if matched:
            return matched
    return devices


def _minute_offset(now: datetime, value: datetime) -> int:
    return round((value - now).total_seconds() / 60)


def _horizon_minutes(now: datetime, tasks: list[TaskInput], windows: list[MaintenanceWindowInput]) -> int:
    total_duration = sum(max(task.duration, 1) for task in tasks)
    due_offsets = [_minute_offset(now, task.due_time) for task in tasks if task.due_time is not None]
    window_offsets = [_minute_offset(now, window.end_time) for window in windows]
    return max([total_duration + 1440, *due_offsets, *window_offsets, 60]) + total_duration
