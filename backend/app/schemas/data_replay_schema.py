from datetime import datetime

from pydantic import BaseModel


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


class DataReplayStatusResponse(BaseModel):
    csv_path: str
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
