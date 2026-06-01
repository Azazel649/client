from sqlalchemy import func, select

from ..models.health import HealthRecord
from .base import BaseRepository


class HealthRepository(BaseRepository[HealthRecord]):
    model = HealthRecord

    def save_health_record(self, record: HealthRecord) -> HealthRecord:
        return self.add(record)

    def get_latest_health(self, device_id: str) -> HealthRecord | None:
        statement = (
            select(HealthRecord)
            .where(HealthRecord.device_id == device_id)
            .order_by(HealthRecord.eval_time.desc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def get_health_trend(self, device_id: str, limit: int = 100) -> list[HealthRecord]:
        statement = (
            select(HealthRecord)
            .where(HealthRecord.device_id == device_id)
            .order_by(HealthRecord.eval_time.desc())
            .limit(limit)
        )
        return list(reversed(self.db.scalars(statement).all()))

    def get_devices_below_threshold(self, threshold: float) -> list[HealthRecord]:
        latest_subquery = (
            select(HealthRecord.device_id, func.max(HealthRecord.eval_time).label("max_eval_time"))
            .group_by(HealthRecord.device_id)
            .subquery()
        )
        statement = (
            select(HealthRecord)
            .join(
                latest_subquery,
                (HealthRecord.device_id == latest_subquery.c.device_id)
                & (HealthRecord.eval_time == latest_subquery.c.max_eval_time),
            )
            .where(HealthRecord.health_index < threshold)
        )
        return list(self.db.scalars(statement).all())
