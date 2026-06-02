from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.schedule_schema import (
    ScheduleAdjustRequest,
    ScheduleGanttResponse,
    ScheduleMetricsResponse,
    ScheduleOptimizeRequest,
    SchedulePlanItemResponse,
    SchedulePlanResponse,
)
from ..services.optimization_service import OptimizationService
from ..services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["schedules"])


def get_optimization_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> OptimizationService:
    return OptimizationService(db, redis_client)


def get_schedule_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> ScheduleService:
    return ScheduleService(db, redis_client)


@router.post("/optimize", response_model=SchedulePlanResponse)
def optimize_schedule(
    payload: ScheduleOptimizeRequest,
    current_user: AdminUser = Depends(require_admin),
    service: OptimizationService = Depends(get_optimization_service),
):
    return service.optimize(payload, operator=current_user.username)


@router.get("/current", response_model=SchedulePlanResponse)
def get_current_schedule(
    _current_user: AdminUser = Depends(require_admin),
    service: ScheduleService = Depends(get_schedule_service),
):
    return service.get_current_plan()


@router.get("/gantt", response_model=ScheduleGanttResponse)
def get_schedule_gantt(
    plan_id: str | None = Query(default=None),
    _current_user: AdminUser = Depends(require_admin),
    service: ScheduleService = Depends(get_schedule_service),
):
    return service.get_gantt_data(plan_id)


@router.post("/adjust-task", response_model=SchedulePlanItemResponse)
def adjust_schedule_task(
    payload: ScheduleAdjustRequest,
    current_user: AdminUser = Depends(require_admin),
    service: ScheduleService = Depends(get_schedule_service),
):
    return service.adjust_task(payload, operator=current_user.username)


@router.post("/confirm", response_model=SchedulePlanResponse)
def confirm_schedule(
    plan_id: str = Query(...),
    current_user: AdminUser = Depends(require_admin),
    service: ScheduleService = Depends(get_schedule_service),
):
    return service.confirm_plan(plan_id, operator=current_user.username)


@router.get("/metrics", response_model=ScheduleMetricsResponse)
def get_schedule_metrics(
    plan_id: str | None = Query(default=None),
    _current_user: AdminUser = Depends(require_admin),
    service: ScheduleService = Depends(get_schedule_service),
):
    return service.get_metrics(plan_id)
