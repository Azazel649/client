from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..repositories.alert_repository import AlertRepository
from ..repositories.schedule_repository import ScheduleLogRepository
from ..schemas.alert_schema import AlertEventResponse, AlertHandleResponse, ScheduleLogResponse


class AlertService:
    def __init__(self, db: Session):
        self.alerts = AlertRepository(db)
        self.logs = ScheduleLogRepository(db)

    def list_alerts(
        self,
        is_handled: int | None = None,
        alert_type: str | None = None,
        limit: int = 100,
    ) -> list[AlertEventResponse]:
        return [
            AlertEventResponse.model_validate(alert)
            for alert in self.alerts.list_alerts(is_handled=is_handled, alert_type=alert_type, limit=limit)
        ]

    def get_unhandled_alerts(self) -> list[AlertEventResponse]:
        return [AlertEventResponse.model_validate(alert) for alert in self.alerts.get_unhandled_alerts()]

    def handle_alert(self, alert_id: str, operator: str | None = None) -> AlertHandleResponse:
        alert = self.alerts.mark_handled(alert_id, operator=operator, handled_time=datetime.now())
        if alert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="alert not found")
        return AlertHandleResponse(alert=AlertEventResponse.model_validate(alert))

    def get_schedule_logs(
        self,
        limit: int = 100,
        task_id: str | None = None,
        reason: str | None = None,
    ) -> list[ScheduleLogResponse]:
        return [
            ScheduleLogResponse.model_validate(log)
            for log in self.logs.get_schedule_logs(limit=limit, task_id=task_id, reason=reason)
        ]
