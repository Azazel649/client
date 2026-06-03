from datetime import datetime

from pydantic import BaseModel


class AlertEventResponse(BaseModel):
    alert_id: str
    device_id: str | None = None
    task_id: str | None = None
    alert_type: str
    alert_level: str
    message: str
    related_data: dict | None = None
    is_handled: int
    create_time: datetime | None = None
    handled_by: str | None = None
    handled_time: datetime | None = None

    model_config = {"from_attributes": True}


class AlertHandleResponse(BaseModel):
    alert: AlertEventResponse
    message: str = "alert handled"


class ScheduleLogResponse(BaseModel):
    id: int
    schedule_time: datetime
    plan_id: str | None = None
    task_id: str
    from_device: str | None = None
    to_device: str | None = None
    reason: str | None = None
    operator: str | None = None
    detail: dict | None = None

    model_config = {"from_attributes": True}
