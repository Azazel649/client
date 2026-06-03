from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..core.config import settings
from ..ml.model_manager import model_manager
from ..models.model_registry import ModelRegistry
from ..repositories.model_repository import ModelMetricRepository, ModelRegistryRepository
from ..schemas.model_schema import (
    ModelMetricResponse,
    ModelRegisterRequest,
    ModelRegistryResponse,
    ModelReloadResponse,
    ModelStatusResponse,
)


class ModelManagerService:
    def __init__(self, db: Session):
        self.models = ModelRegistryRepository(db)
        self.metrics = ModelMetricRepository(db)
        self.backend_root = Path(__file__).resolve().parents[2]

    def register_model(self, payload: ModelRegisterRequest) -> ModelRegistryResponse:
        existing = self.models.get_by_type_version(payload.model_type, payload.version)
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="model type/version already exists")
        model = ModelRegistry(model_id=uuid4().hex, **payload.model_dump())
        self.models.add(model)
        if payload.is_active:
            self.models.activate_model(model.model_id)
        return ModelRegistryResponse.model_validate(model)

    def register_default_models(self) -> list[ModelRegistryResponse]:
        defaults = [
            ModelRegisterRequest(
                model_name=settings.model_name,
                model_type="amd",
                version=settings.model_name,
                file_path=settings.amd_checkpoint_path,
                is_active=1,
                description="Current AMD checkpoint directory used by prediction service",
            ),
            ModelRegisterRequest(
                model_name="two_stage_l_failure_classifier",
                model_type="failure_classifier",
                version="l_hybrid_failure_predictor",
                file_path=settings.tabpfn_model_path,
                is_active=1,
                description="Current second-stage L-machine failure classifier",
            ),
        ]
        output: list[ModelRegistry] = []
        for item in defaults:
            model = self.models.get_by_type_version(item.model_type, item.version)
            if model is None:
                model = ModelRegistry(model_id=uuid4().hex, **item.model_dump())
                self.models.add(model)
            if item.is_active:
                self.models.activate_model(model.model_id)
            output.append(model)
        return [ModelRegistryResponse.model_validate(model) for model in output]

    def list_models(self, model_type: str | None = None) -> list[ModelRegistryResponse]:
        return [ModelRegistryResponse.model_validate(model) for model in self.models.list_models(model_type)]

    def get_active_model(self, model_type: str) -> ModelRegistryResponse | None:
        model = self.models.get_active_model(model_type)
        return ModelRegistryResponse.model_validate(model) if model is not None else None

    def activate_model(self, model_id: str) -> ModelRegistryResponse:
        model = self.models.activate_model(model_id)
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="model not found")
        model_manager.reload_models()
        return ModelRegistryResponse.model_validate(model)

    def get_model_metrics(self, model_id: str) -> list[ModelMetricResponse]:
        if self.models.get(model_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="model not found")
        return [ModelMetricResponse.model_validate(metric) for metric in self.metrics.get_metrics(model_id)]

    def get_model_status(self, model_type: str) -> ModelStatusResponse:
        active = self.models.get_active_model(model_type)
        if active is None:
            return ModelStatusResponse(model_type=model_type, active_model=None, file_exists=False, loadable=False, message="no active model")
        path = self._resolve(active.file_path)
        file_exists = path.exists()
        loadable = file_exists
        message = "ok" if loadable else "model path not found"
        return ModelStatusResponse(
            model_type=model_type,
            active_model=ModelRegistryResponse.model_validate(active),
            file_exists=file_exists,
            loadable=loadable,
            message=message,
        )

    def reload_models(self) -> ModelReloadResponse:
        model_manager.reload_models()
        return ModelReloadResponse()

    def _resolve(self, value: str) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = self.backend_root / path
        return path
