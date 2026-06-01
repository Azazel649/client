from sqlalchemy import select

from ..models.schedule import ScheduleLog, SchedulePlan, SchedulePlanItem
from .base import BaseRepository


class SchedulePlanRepository(BaseRepository[SchedulePlan]):
    model = SchedulePlan

    def save_schedule_plan(self, plan: SchedulePlan) -> SchedulePlan:
        return self.add(plan)

    def get_current_plan(self, plan_type: str | None = None) -> SchedulePlan | None:
        statement = select(SchedulePlan).where(SchedulePlan.status.in_(["draft", "confirmed", "executed"]))
        if plan_type is not None:
            statement = statement.where(SchedulePlan.plan_type == plan_type)
        statement = statement.order_by(SchedulePlan.create_time.desc()).limit(1)
        return self.db.scalar(statement)


class SchedulePlanItemRepository(BaseRepository[SchedulePlanItem]):
    model = SchedulePlanItem

    def save_schedule_items(self, items: list[SchedulePlanItem]) -> list[SchedulePlanItem]:
        self.db.add_all(items)
        self.db.flush()
        return items

    def get_items_by_plan(self, plan_id: str) -> list[SchedulePlanItem]:
        statement = (
            select(SchedulePlanItem)
            .where(SchedulePlanItem.plan_id == plan_id)
            .order_by(SchedulePlanItem.device_id, SchedulePlanItem.start_time)
        )
        return list(self.db.scalars(statement).all())


class ScheduleLogRepository(BaseRepository[ScheduleLog]):
    model = ScheduleLog

    def save_schedule_log(self, log: ScheduleLog) -> ScheduleLog:
        return self.add(log)

    def get_schedule_logs(self, limit: int = 100) -> list[ScheduleLog]:
        statement = select(ScheduleLog).order_by(ScheduleLog.schedule_time.desc()).limit(limit)
        return list(self.db.scalars(statement).all())
