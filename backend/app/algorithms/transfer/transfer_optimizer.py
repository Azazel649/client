from dataclasses import dataclass
from datetime import datetime, timedelta
import random
from statistics import pstdev

from ..dispatch.common import DispatchDevice, DispatchTask, compatible_devices, task_workload


@dataclass(frozen=True)
class ExistingDeviceQueue:
    device_id: str
    available_at: datetime
    current_load: float


@dataclass(frozen=True)
class TransferItem:
    task_id: str
    from_device: str
    to_device: str
    start_time: datetime
    end_time: datetime
    delay_minutes: int


@dataclass(frozen=True)
class TransferMetrics:
    total_delay: int
    makespan: int
    load_balance_score: float
    high_risk_load_rate: float


@dataclass(frozen=True)
class TransferPlan:
    feasible: bool
    anomaly_device_id: str
    items: list[TransferItem]
    metrics: TransferMetrics
    message: str = "ok"


class TransferOptimizer:
    def __init__(
        self,
        min_healthy_hi: float = 70.0,
        population_size: int = 30,
        max_generation: int = 40,
        mutation_rate: float = 0.16,
        random_seed: int = 20260602,
    ):
        self.min_healthy_hi = min_healthy_hi
        self.population_size = max(population_size, 4)
        self.max_generation = max(max_generation, 1)
        self.mutation_rate = max(0.0, min(mutation_rate, 1.0))
        self.random = random.Random(random_seed)

    def optimize(
        self,
        anomaly_device_id: str,
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
        existing_queues: list[ExistingDeviceQueue],
        now: datetime,
    ) -> TransferPlan:
        healthy_devices = [
            device
            for device in devices
            if device.device_id != anomaly_device_id
            and device.health_index >= self.min_healthy_hi
            and device.status in {"running", "idle"}
        ]
        if not tasks:
            return _empty_plan(anomaly_device_id, True, "no unfinished task")
        if not healthy_devices:
            return _empty_plan(anomaly_device_id, False, "no healthy device can receive transferred tasks")
        for task in tasks:
            if not compatible_devices(task, healthy_devices):
                return _empty_plan(anomaly_device_id, False, f"task {task.task_id} has no compatible healthy device")

        queue_map = {queue.device_id: queue for queue in existing_queues}
        population = self._initial_population(tasks, healthy_devices)
        best_plan: TransferPlan | None = None
        best_score = 1_000_000.0
        for _generation in range(self.max_generation):
            scored = []
            for assignment in population:
                plan = self._build_plan(anomaly_device_id, tasks, healthy_devices, queue_map, assignment, now)
                scored.append((self._fitness(plan), assignment, plan))
            scored.sort(key=lambda item: item[0])
            if scored[0][2].feasible and scored[0][0] < best_score:
                best_score = scored[0][0]
                best_plan = scored[0][2]

            elites = [dict(item[1]) for item in scored[: max(2, self.population_size // 6)]]
            next_population = elites[:]
            while len(next_population) < self.population_size:
                left = dict(self.random.choice(scored[: max(2, len(scored) // 2)])[1])
                right = dict(self.random.choice(scored[: max(2, len(scored) // 2)])[1])
                child = self._crossover(left, right, tasks)
                child = self._mutate(child, tasks, healthy_devices)
                child = self._repair(child, tasks, healthy_devices)
                next_population.append(child)
            population = next_population

        return best_plan or _empty_plan(anomaly_device_id, False, "failed to generate transfer plan")

    def _initial_population(self, tasks: list[DispatchTask], devices: list[DispatchDevice]) -> list[dict[str, str]]:
        population: list[dict[str, str]] = []
        greedy: dict[str, str] = {}
        load = {device.device_id: device.current_load for device in devices}
        for task in sorted(tasks, key=lambda value: (-value.priority, -task_workload(value), value.task_id)):
            candidates = compatible_devices(task, devices)
            target = min(candidates, key=lambda device: (load[device.device_id] / max(device.health_index, 1), device.device_id))
            greedy[task.task_id] = target.device_id
            load[target.device_id] += task_workload(task)
        population.append(greedy)

        while len(population) < self.population_size:
            assignment = {}
            for task in tasks:
                candidates = compatible_devices(task, devices)
                assignment[task.task_id] = self.random.choice(candidates).device_id
            population.append(self._repair(assignment, tasks, devices))
        return population

    def _build_plan(
        self,
        anomaly_device_id: str,
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
        queue_map: dict[str, ExistingDeviceQueue],
        assignment: dict[str, str],
        now: datetime,
    ) -> TransferPlan:
        device_map = {device.device_id: device for device in devices}
        available_at = {
            device.device_id: max(now, queue_map.get(device.device_id, ExistingDeviceQueue(device.device_id, now, 0)).available_at)
            for device in devices
        }
        load = {
            device.device_id: queue_map.get(device.device_id, ExistingDeviceQueue(device.device_id, now, device.current_load)).current_load
            for device in devices
        }
        items: list[TransferItem] = []
        for task in sorted(tasks, key=lambda value: (-value.priority, value.due_time or datetime.max, value.task_id)):
            device_id = assignment.get(task.task_id)
            if device_id not in device_map:
                return _empty_plan(anomaly_device_id, False, f"invalid target for task {task.task_id}")
            start_time = available_at[device_id]
            end_time = start_time + timedelta(minutes=max(task.duration, 1))
            delay = _delay_minutes(end_time, task.due_time)
            items.append(
                TransferItem(
                    task_id=task.task_id,
                    from_device=anomaly_device_id,
                    to_device=device_id,
                    start_time=start_time,
                    end_time=end_time,
                    delay_minutes=delay,
                )
            )
            available_at[device_id] = end_time
            load[device_id] = load.get(device_id, 0.0) + task_workload(task)

        metrics = _metrics(items, devices, load, now)
        return TransferPlan(True, anomaly_device_id, items, metrics)

    def _fitness(self, plan: TransferPlan) -> float:
        if not plan.feasible:
            return 1_000_000.0
        return (
            plan.metrics.total_delay * 0.08
            + plan.metrics.makespan * 0.03
            + plan.metrics.load_balance_score * 0.35
            + plan.metrics.high_risk_load_rate * 500
        )

    def _crossover(self, left: dict[str, str], right: dict[str, str], tasks: list[DispatchTask]) -> dict[str, str]:
        if not tasks:
            return {}
        point = self.random.randrange(len(tasks))
        output = {}
        for index, task in enumerate(tasks):
            output[task.task_id] = left.get(task.task_id) if index <= point else right.get(task.task_id)
        return output

    def _mutate(self, assignment: dict[str, str], tasks: list[DispatchTask], devices: list[DispatchDevice]) -> dict[str, str]:
        output = dict(assignment)
        for task in tasks:
            if self.random.random() <= self.mutation_rate:
                output[task.task_id] = self.random.choice(compatible_devices(task, devices)).device_id
        return output

    def _repair(self, assignment: dict[str, str], tasks: list[DispatchTask], devices: list[DispatchDevice]) -> dict[str, str]:
        output = dict(assignment)
        for task in tasks:
            candidate_ids = {device.device_id for device in compatible_devices(task, devices)}
            if output.get(task.task_id) not in candidate_ids:
                output[task.task_id] = self.random.choice(list(candidate_ids))
        return output


def _metrics(items: list[TransferItem], devices: list[DispatchDevice], load: dict[str, float], now: datetime) -> TransferMetrics:
    if not items:
        return TransferMetrics(0, 0, 0.0, 0.0)
    makespan = round((max(item.end_time for item in items) - now).total_seconds() / 60)
    load_values = [load.get(device.device_id, 0.0) for device in devices]
    balance = round(pstdev(load_values), 4) if len(load_values) > 1 else 0.0
    high_risk_devices = {device.device_id for device in devices if device.health_index < 70}
    high_risk_items = [item for item in items if item.to_device in high_risk_devices]
    high_risk_rate = round(len(high_risk_items) / max(len(items), 1), 4)
    return TransferMetrics(
        total_delay=sum(item.delay_minutes for item in items),
        makespan=max(0, makespan),
        load_balance_score=balance,
        high_risk_load_rate=high_risk_rate,
    )


def _delay_minutes(end_time: datetime, due_time: datetime | None) -> int:
    if due_time is None:
        return 0
    return max(0, round((end_time - due_time).total_seconds() / 60))


def _empty_plan(anomaly_device_id: str, feasible: bool, message: str) -> TransferPlan:
    return TransferPlan(feasible, anomaly_device_id, [], TransferMetrics(0, 0, 0.0, 0.0), message)
