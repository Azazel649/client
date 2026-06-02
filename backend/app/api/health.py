from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.health_schema import HealthEvaluationResponse, HealthTrendResponse
from ..services.health_service import HealthService

router = APIRouter(prefix="/health-records", tags=["health-records"])


def get_health_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis_client)) -> HealthService:
    return HealthService(db, redis_client)


@router.get("/{device_id}/latest", response_model=HealthEvaluationResponse)
def get_latest_health(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: HealthService = Depends(get_health_service),
):
    return service.get_latest_health(device_id)


@router.get("/{device_id}/hi-trend", response_model=HealthTrendResponse)
def get_hi_trend(
    device_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    _current_user: AdminUser = Depends(require_admin),
    service: HealthService = Depends(get_health_service),
):
    return service.get_health_trend(device_id, limit)


@router.get("/{device_id}/rul-trend", response_model=HealthTrendResponse)
def get_rul_trend(
    device_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    _current_user: AdminUser = Depends(require_admin),
    service: HealthService = Depends(get_health_service),
):
    return service.get_health_trend(device_id, limit)


@router.get("/low-health", response_model=list[HealthEvaluationResponse])
def get_low_health_devices(
    threshold: float = Query(default=70, ge=0, le=100),
    _current_user: AdminUser = Depends(require_admin),
    service: HealthService = Depends(get_health_service),
):
    return service.get_low_health_devices(threshold)


@router.post("/{device_id}/evaluate", response_model=HealthEvaluationResponse)
def evaluate_latest_prediction(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: HealthService = Depends(get_health_service),
):
    return service.evaluate_latest_prediction(device_id)
