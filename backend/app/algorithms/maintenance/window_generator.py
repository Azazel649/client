from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class MaintenanceWindow:
    start_time: datetime
    end_time: datetime
    deadline: datetime


def generate_window(now: datetime, rul_minutes: float | None, duration_minutes: int) -> MaintenanceWindow:
    if rul_minutes is None:
        deadline = now + timedelta(hours=8)
    else:
        deadline = now + timedelta(minutes=max(30, float(rul_minutes)))

    latest_start = deadline - timedelta(minutes=duration_minutes)
    earliest_start = now + timedelta(minutes=15)
    start_time = min(max(earliest_start, latest_start), deadline)
    end_time = start_time + timedelta(minutes=duration_minutes)
    if end_time > deadline:
        end_time = deadline
        start_time = max(now, end_time - timedelta(minutes=duration_minutes))
    return MaintenanceWindow(start_time=start_time, end_time=end_time, deadline=deadline)
