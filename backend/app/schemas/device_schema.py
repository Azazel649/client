from datetime import datetime

from pydantic import BaseModel, Field


class DeviceResponse(BaseModel):
    device_id: str
    device_name: str
    device_type: str | None = None
    workshop: str | None = None
    status: str
    rated_power: float | None = None
    max_load_rate: float | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None

    model_config = {"from_attributes": True}


class DeviceStatusUpdateRequest(BaseModel):
    status: str = Field(pattern="^(running|idle|locked|maintenance|offline|fault)$")


class DeviceCurrentStatusResponse(BaseModel):
    id: str
    name: str
    device_type: str | None = None
    workshop: str | None = None
    status: str
    health_index: float
    health_level: str
    rul_hours: float
    risk_score: float
    air_temperature: float
    process_temperature: float
    rotational_speed: int
    torque: float
    tool_wear: int
    latest_fault_type: str
    latest_fault_probability: float
    load_rate: float
    updated_at: datetime | None = None


class DeviceDetailResponse(BaseModel):
    device: DeviceResponse
    current_status: DeviceCurrentStatusResponse | None = None


class OperationLogResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    air_temp: float | None = None
    process_temp: float | None = None
    rotational_speed: int | None = None
    torque: float | None = None
    tool_wear: int | None = None
    source: str

    model_config = {"from_attributes": True}


class OperationTrendResponse(BaseModel):
    device_id: str
    points: list[OperationLogResponse]
