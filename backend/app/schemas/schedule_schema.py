from datetime import datetime

from pydantic import BaseModel, Field


class ScheduleOptimizeRequest(BaseModel):
    plan_name: str | None = None
    save_as_draft: bool = True


class SchedulePlanItemResponse(BaseModel):
    id: int | None = None
    plan_id: str | None = None
    task_id: str
    device_id: str
    original_device_id: str | None = None
    start_time: datetime
    end_time: datetime
    delay_minutes: int
    is_adjusted: int = 0
    item_type: str = "production"

    model_config = {"from_attributes": True}


class SchedulePlanResponse(BaseModel):
    plan_id: str
    plan_type: str
    plan_name: str | None = None
    total_delay: int
    makespan: int | None = None
    avg_load_rate: float | None = None
    load_balance_score: float | None = None
    health_match_score: float | None = None
    high_risk_load_rate: float | None = None
    status: str
    algorithm: str | None = None
    create_time: datetime | None = None
    confirmed_by: str | None = None
    confirmed_time: datetime | None = None
    remark: str | None = None
    items: list[SchedulePlanItemResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ScheduleGanttItem(BaseModel):
    id: str
    plan_id: str | None = None
    task_id: str | None = None
    task_name: str | None = None
    device_id: str
    start_time: datetime
    end_time: datetime
    item_type: str
    delay_minutes: int = 0
    status: str | None = None


class ScheduleGanttResponse(BaseModel):
    plan_id: str | None = None
    items: list[ScheduleGanttItem]


class ScheduleAdjustRequest(BaseModel):
    plan_id: str
    task_id: str
    device_id: str
    start_time: datetime
    end_time: datetime


class ScheduleMetricsResponse(BaseModel):
    plan_id: str
    total_delay: int
    makespan: int | None = None
    avg_load_rate: float | None = None
    load_balance_score: float | None = None
    high_risk_load_rate: float | None = None
