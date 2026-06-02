from datetime import datetime
import random

from .common import DispatchDevice, DispatchSolution, DispatchTask, compatible_devices, is_device_available
from .greedy_scheduler import build_dispatch_solution


class GeneticOptimizer:
    def __init__(
        self,
        population_size: int = 32,
        max_generation: int = 40,
        mutation_rate: float = 0.12,
        min_health_index: float = 30.0,
        random_seed: int = 20260602,
    ):
        self.population_size = max(population_size, 4)
        self.max_generation = max(max_generation, 1)
        self.mutation_rate = max(0.0, min(mutation_rate, 1.0))
        self.min_health_index = min_health_index
        self.random = random.Random(random_seed)

    def optimize(
        self,
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
        greedy_solution: DispatchSolution,
        now: datetime,
    ) -> DispatchSolution:
        available_devices = [device for device in devices if is_device_available(device, self.min_health_index)]
        if not greedy_solution.feasible:
            return greedy_solution
        population = self._initial_population(tasks, available_devices, greedy_solution.assignment)

        best_solution = greedy_solution
        best_score = self._fitness(greedy_solution)
        for _generation in range(self.max_generation):
            scored = sorted(
                ((self._fitness(build_dispatch_solution(tasks, available_devices, item, now)), item) for item in population),
                key=lambda pair: pair[0],
            )
            current_solution = build_dispatch_solution(tasks, available_devices, scored[0][1], now)
            if current_solution.feasible and scored[0][0] < best_score:
                best_solution = current_solution
                best_score = scored[0][0]

            elites = [item for _score, item in scored[: max(2, self.population_size // 6)]]
            next_population = elites[:]
            while len(next_population) < self.population_size:
                left = self._tournament(scored)
                right = self._tournament(scored)
                child = self._crossover(left, right, tasks)
                child = self._mutate(child, tasks, available_devices)
                child = self._repair(child, tasks, available_devices)
                next_population.append(child)
            population = next_population

        return best_solution

    def _initial_population(
        self,
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
        greedy_assignment: dict[str, str],
    ) -> list[dict[str, str]]:
        population = [dict(greedy_assignment)]
        while len(population) < self.population_size:
            assignment: dict[str, str] = {}
            for task in tasks:
                candidates = compatible_devices(task, devices)
                assignment[task.task_id] = self.random.choice(candidates).device_id
            population.append(self._repair(assignment, tasks, devices))
        return population

    def _fitness(self, solution: DispatchSolution) -> float:
        if not solution.feasible:
            return 1_000_000.0
        metrics = solution.metrics
        return (
            metrics.load_balance_score * 0.35
            + metrics.makespan * 0.02
            + metrics.total_delay * 0.08
            + (1 - metrics.health_match_score) * 120
            + metrics.high_risk_load_rate * 300
        )

    def _tournament(self, scored: list[tuple[float, dict[str, str]]]) -> dict[str, str]:
        candidates = self.random.sample(scored, k=min(3, len(scored)))
        return dict(min(candidates, key=lambda pair: pair[0])[1])

    def _crossover(self, left: dict[str, str], right: dict[str, str], tasks: list[DispatchTask]) -> dict[str, str]:
        if not tasks:
            return {}
        point = self.random.randrange(len(tasks))
        child: dict[str, str] = {}
        for index, task in enumerate(tasks):
            child[task.task_id] = left.get(task.task_id) if index <= point else right.get(task.task_id)
        return child

    def _mutate(
        self,
        assignment: dict[str, str],
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
    ) -> dict[str, str]:
        mutated = dict(assignment)
        for task in tasks:
            if self.random.random() > self.mutation_rate:
                continue
            candidates = compatible_devices(task, devices)
            mutated[task.task_id] = self.random.choice(candidates).device_id
        return mutated

    def _repair(
        self,
        assignment: dict[str, str],
        tasks: list[DispatchTask],
        devices: list[DispatchDevice],
    ) -> dict[str, str]:
        repaired = dict(assignment)
        device_ids = {device.device_id for device in devices}
        for task in tasks:
            candidates = compatible_devices(task, devices)
            candidate_ids = {device.device_id for device in candidates}
            current = repaired.get(task.task_id)
            if current not in device_ids or current not in candidate_ids:
                repaired[task.task_id] = self.random.choice(candidates).device_id
        return repaired
