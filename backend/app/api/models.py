from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..models.user import AdminUser
from ..schemas.model_schema import (
    ModelMetricResponse,
    ModelRegisterRequest,
    ModelRegistryResponse,
    ModelReloadResponse,
    ModelStatusResponse,
)
from ..services.model_manager_service import ModelManagerService

router = APIRouter(prefix="/models", tags=["models"])


def get_model_service(db: Session = Depends(get_db)) -> ModelManagerService:
    return ModelManagerService(db)


@router.post("", response_model=ModelRegistryResponse)
def register_model(
    payload: ModelRegisterRequest,
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.register_model(payload)


@router.post("/register-defaults", response_model=list[ModelRegistryResponse])
def register_default_models(
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.register_default_models()


@router.get("", response_model=list[ModelRegistryResponse])
def list_models(
    model_type: str | None = Query(default=None),
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.list_models(model_type)


@router.get("/active/{model_type}", response_model=ModelRegistryResponse | None)
def get_active_model(
    model_type: str,
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.get_active_model(model_type)


@router.get("/status/{model_type}", response_model=ModelStatusResponse)
def get_model_status(
    model_type: str,
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.get_model_status(model_type)


@router.post("/{model_id}/activate", response_model=ModelRegistryResponse)
def activate_model(
    model_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.activate_model(model_id)


@router.get("/{model_id}/metrics", response_model=list[ModelMetricResponse])
def get_model_metrics(
    model_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.get_model_metrics(model_id)


@router.post("/reload", response_model=ModelReloadResponse)
def reload_models(
    _current_user: AdminUser = Depends(require_admin),
    service: ModelManagerService = Depends(get_model_service),
):
    return service.reload_models()
