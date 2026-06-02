from datetime import datetime

from pydantic import BaseModel, Field

from .schedule_schema import SchedulePlanItemResponse, SchedulePlanResponse


class DispatchRunRequest(BaseModel):
    plan_name: str | None = None
    save_as_draft: bool = True
    population_size: int = Field(default=32, ge=4, le=200)
    max_generation: int = Field(default=40, ge=1, le=300)
    mutation_rate: float = Field(default=0.12, ge=0, le=1)
    min_health_index: float = Field(default=30.0, ge=0, le=100)


class DispatchDeviceState(BaseModel):
    device_id: str
    device_type: str | None = None
    status: str
    health_index: float
    rul_minutes: float
    current_load: float
    task_count: int
    load_health_ratio: float


class DispatchPlanResponse(BaseModel):
    plan: SchedulePlanResponse
    device_states: list[DispatchDeviceState]
    algorithm: str = "greedy_ga_health_dispatch"


class DispatchGanttResponse(BaseModel):
    plan_id: str
    items: list[SchedulePlanItemResponse]
    generated_at: datetime
