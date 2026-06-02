from datetime import datetime

from pydantic import BaseModel


class HealthEvaluationResponse(BaseModel):
    id: int
    device_id: str
    eval_time: datetime
    prediction_id: int | None = None
    health_index: float | None = None
    raw_health_index: float | None = None
    last_health_index: float | None = None
    rul_minutes: float | None = None
    health_level: str | None = None
    risk_score: float | None = None
    temperature_anomaly: float | None = None
    power_anomaly: float | None = None
    model_risk: float | None = None
    is_abnormal: int

    model_config = {"from_attributes": True}


class HealthTrendPoint(BaseModel):
    eval_time: datetime
    health_index: float | None = None
    rul_minutes: float | None = None
    health_level: str | None = None
    risk_score: float | None = None


class HealthTrendResponse(BaseModel):
    device_id: str
    points: list[HealthTrendPoint]
