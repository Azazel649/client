from sqlalchemy import select

from ..models.alert import AlertEvent
from .base import BaseRepository


class AlertRepository(BaseRepository[AlertEvent]):
    model = AlertEvent

    def save_alert(self, alert: AlertEvent) -> AlertEvent:
        return self.add(alert)

    def get_unhandled_alerts(self) -> list[AlertEvent]:
        statement = (
            select(AlertEvent)
            .where(AlertEvent.is_handled == 0)
            .order_by(AlertEvent.create_time.desc())
        )
        return list(self.db.scalars(statement).all())

    def mark_handled(self, alert_id: str, operator: str | None = None, handled_time=None) -> AlertEvent | None:
        alert = self.get(alert_id)
        if alert is None:
            return None
        alert.is_handled = 1
        alert.handled_by = operator
        alert.handled_time = handled_time
        self.db.flush()
        return alert
