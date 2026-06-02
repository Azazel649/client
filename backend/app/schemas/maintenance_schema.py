from datetime import datetime

from pydantic import BaseModel, Field


class MaintenanceWindowGenerateRequest(BaseModel):
    device_ids: list[str] = Field(default_factory=list)


class MaintenancePlanUpdateRequest(BaseModel):
    plan_start_time: datetime | None = None
    plan_end_time: datetime | None = None
    maintenance_type: str | None = Field(default=None, pattern="^(repair|replace)$")
    risk_level: str | None = Field(default=None, pattern="^(low|medium|high)$")
    reason: str | None = Field(default=None, max_length=128)
    status: str | None = Field(default=None, pattern="^(pending|confirmed|executing|finished|cancelled)$")


class MaintenancePlanResponse(BaseModel):
    plan_id: str
    device_id: str
    plan_start_time: datetime
    plan_end_time: datetime
    maintenance_type: str | None = None
    duration_minutes: int | None = None
    deadline: datetime | None = None
    risk_level: str | None = None
    source: str
    reason: str | None = None
    status: str
    create_time: datetime | None = None
    update_time: datetime | None = None

    model_config = {"from_attributes": True}


class MaintenanceGenerateItem(BaseModel):
    device_id: str
    generated: bool
    message: str
    plan: MaintenancePlanResponse | None = None
    conflict_task_ids: list[str] = Field(default_factory=list)


class MaintenanceGenerateResponse(BaseModel):
    items: list[MaintenanceGenerateItem]


class MaintenanceGanttItem(BaseModel):
    id: str
    device_id: str
    title: str
    start_time: datetime
    end_time: datetime
    item_type: str
    status: str
    conflict_task_ids: list[str] = Field(default_factory=list)


class MaintenanceGanttResponse(BaseModel):
    items: list[MaintenanceGanttItem]
