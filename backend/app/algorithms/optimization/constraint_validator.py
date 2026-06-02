from datetime import datetime


def validate_task_adjustment(
    device_id: str,
    start_time: datetime,
    end_time: datetime,
    maintenance_windows: list[tuple[str, datetime, datetime]],
    scheduled_items: list[tuple[str, str, datetime, datetime]],
    ignore_task_id: str | None = None,
) -> tuple[bool, str]:
    if start_time >= end_time:
        return False, "start_time must be earlier than end_time"

    for window_device_id, window_start, window_end in maintenance_windows:
        if window_device_id == device_id and start_time < window_end and end_time > window_start:
            return False, f"time range conflicts with maintenance window on {device_id}"

    for task_id, item_device_id, item_start, item_end in scheduled_items:
        if ignore_task_id and task_id == ignore_task_id:
            continue
        if item_device_id == device_id and start_time < item_end and end_time > item_start:
            return False, f"time range conflicts with task {task_id}"

    return True, "adjustment is valid"
