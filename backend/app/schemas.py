from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, Field


class DeviceStatus(str, Enum):
    running = "running"
    warning = "warning"
    maintenance = "maintenance"
    offline = "offline"


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    transferred = "transferred"


class Device(BaseModel):
    id: str
    name: str
    workshop: str
    status: DeviceStatus
    health_index: int = Field(ge=0, le=100)
    rul_hours: int = Field(ge=0)
    air_temperature: float
    process_temperature: float
    rotational_speed: int
    torque: float
    tool_wear: int
    load_rate: float = Field(ge=0, le=1)
    updated_at: datetime


class MaintenancePlan(BaseModel):
    id: str
    device_id: str
    device_name: str
    window_start: datetime
    window_end: datetime
    reason: str
    priority: str
    status: str


class ProductionTask(BaseModel):
    id: str
    order_no: str
    product_name: str
    planned_quantity: int
    load_level: str
    due_date: date
    assigned_device_id: str | None = None
    assigned_device_name: str | None = None
    status: TaskStatus


class DashboardSummary(BaseModel):
    total_devices: int
    running_devices: int
    warning_devices: int
    average_health_index: float
    pending_maintenance: int
    active_tasks: int


class DispatchResult(BaseModel):
    message: str
    tasks: list[ProductionTask]

