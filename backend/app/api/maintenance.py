from fastapi import APIRouter, Depends, Query, Response, status
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.maintenance_schema import (
    MaintenanceGanttResponse,
    MaintenanceGenerateResponse,
    MaintenancePlanResponse,
    MaintenancePlanUpdateRequest,
    MaintenanceWindowGenerateRequest,
)
from ..services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def get_maintenance_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis_client)) -> MaintenanceService:
    return MaintenanceService(db, redis_client)


@router.get("/plans", response_model=list[MaintenancePlanResponse])
def list_maintenance_plans(
    status_value: str | None = Query(default=None, alias="status"),
    device_id: str | None = Query(default=None),
    _current_user: AdminUser = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return service.list_plans(status_value=status_value, device_id=device_id)


@router.post("/windows/generate", response_model=MaintenanceGenerateResponse)
def generate_maintenance_windows(
    payload: MaintenanceWindowGenerateRequest,
    _current_user: AdminUser = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return service.generate_windows(payload.device_ids)


@router.patch("/plans/{plan_id}", response_model=MaintenancePlanResponse)
def update_maintenance_plan(
    plan_id: str,
    payload: MaintenancePlanUpdateRequest,
    _current_user: AdminUser = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return service.update_plan(plan_id, payload)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_plan(
    plan_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    service.delete_plan(plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/gantt", response_model=MaintenanceGanttResponse)
def get_maintenance_gantt(
    _current_user: AdminUser = Depends(require_admin),
    service: MaintenanceService = Depends(get_maintenance_service),
):
    return service.get_gantt()
