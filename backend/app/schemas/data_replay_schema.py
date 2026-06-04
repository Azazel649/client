from datetime import datetime

from pydantic import BaseModel, Field

from .prediction_schema import PredictionRunResponse


class ReplayedOperationResponse(BaseModel):
    device_id: str
    timestamp: datetime
    air_temp: float
    process_temp: float
    rotational_speed: int
    torque: float
    tool_wear: int
    source: str = "replay"


class DataReplayStepResponse(BaseModel):
    pointer_before: int
    pointer_after: int
    wrapped: bool
    rows_replayed: int
    operations: list[ReplayedOperationResponse]
    history_before_wear: float | None = None
    prediction_limit_wear: float | None = None
    prediction_interval: float | None = None
    auto_predictions: list[PredictionRunResponse] = Field(default_factory=list)


class DataReplayStatusResponse(BaseModel):
    csv_path: str
    history_csv_path: str | None = None
    exists: bool
    total_rows: int
    pointer: int
    device_ids: list[str]
    interval_seconds: int
    auto_start: bool
    job_running: bool


class DataReplayResetResponse(BaseModel):
    pointer: int
    message: str
