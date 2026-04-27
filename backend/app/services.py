from .data import DEVICES, MAINTENANCE_PLANS, PRODUCTION_TASKS
from .schemas import DashboardSummary, DeviceStatus, DispatchResult, ProductionTask, TaskStatus


def get_dashboard_summary() -> DashboardSummary:
    running_devices = sum(1 for device in DEVICES if device.status == DeviceStatus.running)
    warning_devices = sum(1 for device in DEVICES if device.status == DeviceStatus.warning)
    average_hi = sum(device.health_index for device in DEVICES) / len(DEVICES)
    active_tasks = sum(1 for task in PRODUCTION_TASKS if task.status in {TaskStatus.pending, TaskStatus.running})

    return DashboardSummary(
        total_devices=len(DEVICES),
        running_devices=running_devices,
        warning_devices=warning_devices,
        average_health_index=round(average_hi, 1),
        pending_maintenance=len(MAINTENANCE_PLANS),
        active_tasks=active_tasks,
    )


def generate_maintenance_windows():
    # Placeholder for the future RUL/HI maintenance-window optimization model.
    return MAINTENANCE_PLANS


def dispatch_tasks() -> DispatchResult:
    # Placeholder for the future health-aware scheduling algorithm.
    healthy_devices = sorted(
        (device for device in DEVICES if device.status != DeviceStatus.maintenance),
        key=lambda device: device.health_index,
        reverse=True,
    )

    scheduled_tasks: list[ProductionTask] = []
    for index, task in enumerate(PRODUCTION_TASKS):
        if task.status == TaskStatus.completed:
            scheduled_tasks.append(task)
            continue

        device = healthy_devices[index % len(healthy_devices)]
        scheduled_tasks.append(
            task.model_copy(
                update={
                    "assigned_device_id": device.id,
                    "assigned_device_name": device.name,
                    "status": TaskStatus.running,
                }
            )
        )

    return DispatchResult(message="已基于设备健康度生成模拟调度结果", tasks=scheduled_tasks)

