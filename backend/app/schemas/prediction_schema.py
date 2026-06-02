from datetime import datetime

from pydantic import BaseModel, Field

from .health_schema import HealthEvaluationResponse


class PredictionTriggerRequest(BaseModel):
    query_wear: float | None = Field(default=None, ge=0)
    machine_type: str | None = Field(default=None, pattern="^[LMHlmh]$")
    history_csv: str | None = None


class PredictionResultResponse(BaseModel):
    id: int
    device_id: str
    predict_time: datetime
    target_timestamp: datetime | None = None
    forecast_horizon: int | None = None
    fault_type: str | None = None
    probability: float | None = None
    p_no_failure: float | None = None
    p_heat: float | None = None
    p_power: float | None = None
    p_overstrain: float | None = None
    p_tool_wear: float | None = None
    predicted_params: dict | None = None
    model_version: str | None = None

    model_config = {"from_attributes": True}


class FaultProbabilityResponse(BaseModel):
    device_id: str
    p_no_failure: float
    p_heat: float
    p_power: float
    p_overstrain: float
    p_tool_wear: float


class PredictionRunResponse(BaseModel):
    prediction: PredictionResultResponse
    health: HealthEvaluationResponse
    stage1_query_result: dict
