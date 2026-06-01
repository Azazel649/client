from datetime import datetime

from sqlalchemy import select

from ..models.operation import OperationLog
from .base import BaseRepository


class OperationRepository(BaseRepository[OperationLog]):
    model = OperationLog

    def insert_operation_log(self, log: OperationLog) -> OperationLog:
        return self.add(log)

    def get_recent_logs(self, device_id: str, limit: int) -> list[OperationLog]:
        statement = (
            select(OperationLog)
            .where(OperationLog.device_id == device_id)
            .order_by(OperationLog.timestamp.desc())
            .limit(limit)
        )
        return list(reversed(self.db.scalars(statement).all()))

    def get_operation_trend(self, device_id: str, start_time: datetime, end_time: datetime) -> list[OperationLog]:
        statement = (
            select(OperationLog)
            .where(
                OperationLog.device_id == device_id,
                OperationLog.timestamp >= start_time,
                OperationLog.timestamp <= end_time,
            )
            .order_by(OperationLog.timestamp)
        )
        return list(self.db.scalars(statement).all())
