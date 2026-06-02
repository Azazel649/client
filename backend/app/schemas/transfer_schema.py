from datetime import datetime

from pydantic import BaseModel, Field


class HIAnomalyResponse(BaseModel):
    device_id: str
    current_hi: float
    last_hi: float
    drop_value: float
    alert_level: str
    reason: str
    detected_at: datetime
    alert_id: str | None = None


class MonitorCheckResponse(BaseModel):
    checked_at: datetime
    anomalies: list[HIAnomalyResponse]


class TransferPlanRequest(BaseModel):
    min_healthy_hi: float = Field(default=70.0, ge=0, le=100)
    population_size: int = Field(default=30, ge=4, le=200)
    max_generation: int = Field(default=40, ge=1, le=300)
    mutation_rate: float = Field(default=0.16, ge=0, le=1)


class TransferItemResponse(BaseModel):
    task_id: str
    from_device: str
    to_device: str
    start_time: datetime
    end_time: datetime
    delay_minutes: int


class TransferMetricsResponse(BaseModel):
    total_delay: int
    makespan: int
    load_balance_score: float
    high_risk_load_rate: float


class TransferPlanResponse(BaseModel):
    feasible: bool
    anomaly_device_id: str
    items: list[TransferItemResponse]
    metrics: TransferMetricsResponse
    message: str = "ok"


class TransferExecuteResponse(BaseModel):
    device_id: str
    transferred_tasks: int
    executed_at: datetime
    message: str
