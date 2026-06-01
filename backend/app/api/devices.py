from datetime import datetime

from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import get_current_user, require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.device_schema import (
    DeviceCurrentStatusResponse,
    DeviceDetailResponse,
    DeviceResponse,
    DeviceStatusUpdateRequest,
    OperationTrendResponse,
)
from ..services.device_service import DeviceService

router = APIRouter(prefix="/devices", tags=["devices"])


def get_device_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis_client)) -> DeviceService:
    return DeviceService(db, redis_client)


@router.get("", response_model=list[DeviceResponse])
def list_devices(
    _current_user: AdminUser = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
):
    return service.list_devices()


@router.get("/current-status", response_model=list[DeviceCurrentStatusResponse])
def list_current_status(
    _current_user: AdminUser = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
):
    return service.list_current_status()


@router.get("/{device_id}", response_model=DeviceDetailResponse)
def get_device_detail(
    device_id: str,
    _current_user: AdminUser = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
):
    return service.get_device_detail(device_id)


@router.get("/{device_id}/operation-trend", response_model=OperationTrendResponse)
def get_operation_trend(
    device_id: str,
    start_time: datetime | None = Query(default=None),
    end_time: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    _current_user: AdminUser = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
):
    return service.get_operation_trend(device_id, start_time=start_time, end_time=end_time, limit=limit)


@router.patch("/{device_id}/status", response_model=DeviceResponse)
def update_device_status(
    device_id: str,
    payload: DeviceStatusUpdateRequest,
    _current_user: AdminUser = Depends(require_admin),
    service: DeviceService = Depends(get_device_service),
):
    return service.update_status(device_id, payload.status)
