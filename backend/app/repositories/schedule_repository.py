from sqlalchemy import delete, select

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

    def update_plan(self, plan_id: str, **values) -> SchedulePlan | None:
        plan = self.get(plan_id)
        if plan is None:
            return None
        for key, value in values.items():
            if value is not None and hasattr(plan, key):
                setattr(plan, key, value)
        self.db.flush()
        return plan


class SchedulePlanItemRepository(BaseRepository[SchedulePlanItem]):
    model = SchedulePlanItem

    def save_schedule_items(self, items: list[SchedulePlanItem]) -> list[SchedulePlanItem]:
        self.db.add_all(items)
        self.db.flush()
        return items

    def delete_items_by_plan(self, plan_id: str) -> None:
        self.db.execute(delete(SchedulePlanItem).where(SchedulePlanItem.plan_id == plan_id))
        self.db.flush()

    def get_items_by_plan(self, plan_id: str) -> list[SchedulePlanItem]:
        statement = (
            select(SchedulePlanItem)
            .where(SchedulePlanItem.plan_id == plan_id)
            .order_by(SchedulePlanItem.device_id, SchedulePlanItem.start_time)
        )
        return list(self.db.scalars(statement).all())

    def get_item_by_plan_and_task(self, plan_id: str, task_id: str) -> SchedulePlanItem | None:
        statement = select(SchedulePlanItem).where(
            SchedulePlanItem.plan_id == plan_id,
            SchedulePlanItem.task_id == task_id,
        )
        return self.db.scalar(statement)

    def update_item(self, item: SchedulePlanItem, **values) -> SchedulePlanItem:
        for key, value in values.items():
            if value is not None and hasattr(item, key):
                setattr(item, key, value)
        self.db.flush()
        return item


class ScheduleLogRepository(BaseRepository[ScheduleLog]):
    model = ScheduleLog

    def save_schedule_log(self, log: ScheduleLog) -> ScheduleLog:
        return self.add(log)

    def get_schedule_logs(self, limit: int = 100, task_id: str | None = None, reason: str | None = None) -> list[ScheduleLog]:
        statement = select(ScheduleLog)
        if task_id is not None:
            statement = statement.where(ScheduleLog.task_id == task_id)
        if reason is not None:
            statement = statement.where(ScheduleLog.reason == reason)
        statement = statement.order_by(ScheduleLog.schedule_time.desc()).limit(limit)
        return list(self.db.scalars(statement).all())
