from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..models.user import AdminUser
from ..schemas.alert_schema import AlertEventResponse, AlertHandleResponse, ScheduleLogResponse
from ..services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])


def get_alert_service(db: Session = Depends(get_db)) -> AlertService:
    return AlertService(db)


@router.get("", response_model=list[AlertEventResponse])
def list_alerts(
    is_handled: int | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    _current_user: AdminUser = Depends(require_admin),
    service: AlertService = Depends(get_alert_service),
):
    return service.list_alerts(is_handled=is_handled, alert_type=alert_type, limit=limit)


@router.get("/unhandled", response_model=list[AlertEventResponse])
def get_unhandled_alerts(
    _current_user: AdminUser = Depends(require_admin),
    service: AlertService = Depends(get_alert_service),
):
    return service.get_unhandled_alerts()


@router.get("/schedule-logs", response_model=list[ScheduleLogResponse])
def get_schedule_logs(
    limit: int = Query(default=100, ge=1, le=500),
    task_id: str | None = Query(default=None),
    reason: str | None = Query(default=None),
    _current_user: AdminUser = Depends(require_admin),
    service: AlertService = Depends(get_alert_service),
):
    return service.get_schedule_logs(limit=limit, task_id=task_id, reason=reason)


@router.post("/{alert_id}/handle", response_model=AlertHandleResponse)
def handle_alert(
    alert_id: str,
    current_user: AdminUser = Depends(require_admin),
    service: AlertService = Depends(get_alert_service),
):
    return service.handle_alert(alert_id, operator=current_user.username)
