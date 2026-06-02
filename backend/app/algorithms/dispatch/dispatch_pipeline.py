from dataclasses import dataclass
from datetime import datetime

from .common import DispatchDevice, DispatchSolution, DispatchTask
from .genetic_optimizer import GeneticOptimizer
from .greedy_scheduler import GreedyScheduler


@dataclass(frozen=True)
class DispatchPipelineParams:
    population_size: int = 32
    max_generation: int = 40
    mutation_rate: float = 0.12
    min_health_index: float = 30.0


class DispatchPipeline:
    def __init__(self, params: DispatchPipelineParams | None = None):
        self.params = params or DispatchPipelineParams()

    def run(self, tasks: list[DispatchTask], devices: list[DispatchDevice], now: datetime) -> DispatchSolution:
        greedy = GreedyScheduler(min_health_index=self.params.min_health_index)
        greedy_solution = greedy.schedule(tasks, devices, now)
        if not greedy_solution.feasible:
            return greedy_solution
        optimizer = GeneticOptimizer(
            population_size=self.params.population_size,
            max_generation=self.params.max_generation,
            mutation_rate=self.params.mutation_rate,
            min_health_index=self.params.min_health_index,
        )
        return optimizer.optimize(tasks, devices, greedy_solution, now)
