from datetime import datetime

from pydantic import BaseModel, Field


class ModelRegisterRequest(BaseModel):
    model_name: str = Field(min_length=1, max_length=64)
    model_type: str = Field(min_length=1, max_length=32)
    version: str = Field(min_length=1, max_length=32)
    file_path: str = Field(min_length=1, max_length=255)
    is_active: int = Field(default=0, ge=0, le=1)
    description: str | None = None


class ModelRegistryResponse(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    version: str
    file_path: str
    is_active: int
    description: str | None = None
    create_time: datetime | None = None

    model_config = {"from_attributes": True}


class ModelMetricResponse(BaseModel):
    id: int
    model_id: str
    metric_name: str
    metric_value: float
    dataset_name: str | None = None
    eval_time: datetime | None = None

    model_config = {"from_attributes": True}


class ModelStatusResponse(BaseModel):
    model_type: str
    active_model: ModelRegistryResponse | None = None
    file_exists: bool
    loadable: bool
    message: str


class ModelReloadResponse(BaseModel):
    message: str = "models reloaded"
