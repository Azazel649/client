from datetime import datetime

from pydantic import BaseModel, Field


class ProductionTaskCreate(BaseModel):
    task_id: str = Field(min_length=1, max_length=32)
    task_name: str = Field(min_length=1, max_length=64)
    product_type: str | None = None
    required_device_type: str | None = None
    duration: int = Field(gt=0)
    priority: int = Field(default=0, ge=0)
    load_weight: float = Field(default=1, gt=0)
    predecessor_task_id: str | None = None
    due_time: datetime | None = None
    assigned_device: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str = "pending"


class ProductionTaskUpdate(BaseModel):
    task_name: str | None = Field(default=None, min_length=1, max_length=64)
    product_type: str | None = None
    required_device_type: str | None = None
    duration: int | None = Field(default=None, gt=0)
    priority: int | None = Field(default=None, ge=0)
    load_weight: float | None = Field(default=None, gt=0)
    predecessor_task_id: str | None = None
    due_time: datetime | None = None
    assigned_device: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = None


class ProductionTaskResponse(BaseModel):
    task_id: str
    task_name: str
    product_type: str | None = None
    required_device_type: str | None = None
    duration: int | None = None
    priority: int
    load_weight: float
    predecessor_task_id: str | None = None
    due_time: datetime | None = None
    assigned_device: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    actual_start_time: datetime | None = None
    actual_end_time: datetime | None = None
    status: str
    create_time: datetime | None = None
    update_time: datetime | None = None

    model_config = {"from_attributes": True}


class TaskQueueResponse(BaseModel):
    device_id: str
    tasks: list[ProductionTaskResponse]
