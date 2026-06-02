from .pulp_solver import ScheduleSolution


def extract_schedule(solution: ScheduleSolution) -> list[dict]:
    return [
        {
            "task_id": item.task_id,
            "device_id": item.device_id,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "delay_minutes": item.delay_minutes,
            "item_type": "production",
        }
        for item in solution.items
    ]


def get_optimization_metrics(solution: ScheduleSolution) -> dict:
    return {
        "total_delay": solution.total_delay,
        "makespan": solution.makespan,
        "avg_load_rate": solution.avg_load_rate,
        "load_balance_score": solution.load_balance_score,
    }
