from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.prediction_schema import (
    FaultProbabilityResponse,
    PredictionResultResponse,
    PredictionRunResponse,
    PredictionTriggerRequest,
)
from ..services.prediction_service import PredictionService

router = APIRouter(prefix="/predictions", tags=["predictions"])


def get_prediction_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis_client)) -> PredictionService:
    return PredictionService(db, redis_client)


@router.post("/{device_id}/trigger", response_model=PredictionRunResponse)
def trigger_prediction(
    device_id: str,
    payload: PredictionTriggerRequest | None = None,
    _current_user: AdminUser = Depends(require_admin),
    service: PredictionService = Depends(get_prediction_service),
):
    payload = payload or PredictionTriggerRequest()
    return service.execute_prediction(
        device_id=device_id,
        query_wear=payload.query_wear,
        machine_type=payload.machine_type,
        history_csv=payload.history_csv,
    )


@router.get("/{device_id}/latest", response_model=PredictionResultResponse)
def get_latest_prediction(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: PredictionService = Depends(get_prediction_service),
):
    return service.get_latest_prediction(device_id)


@router.get("/{device_id}/history", response_model=list[PredictionResultResponse])
def get_prediction_history(
    device_id: str,
    limit: int = Query(default=50, ge=1, le=500),
    _current_user: AdminUser = Depends(require_admin),
    service: PredictionService = Depends(get_prediction_service),
):
    return service.get_prediction_history(device_id, limit)


@router.get("/{device_id}/fault-probabilities", response_model=FaultProbabilityResponse)
def get_fault_probabilities(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: PredictionService = Depends(get_prediction_service),
):
    return service.get_fault_probabilities(device_id)
