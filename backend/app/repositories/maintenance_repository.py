from sqlalchemy import select

from ..models.maintenance import MaintenancePlan
from .base import BaseRepository


class MaintenanceRepository(BaseRepository[MaintenancePlan]):
    model = MaintenancePlan

    def create_plan(self, plan: MaintenancePlan) -> MaintenancePlan:
        return self.add(plan)

    def list_plans(self, status: str | None = None, device_id: str | None = None) -> list[MaintenancePlan]:
        statement = select(MaintenancePlan)
        if status is not None:
            statement = statement.where(MaintenancePlan.status == status)
        if device_id is not None:
            statement = statement.where(MaintenancePlan.device_id == device_id)
        statement = statement.order_by(MaintenancePlan.plan_start_time.desc())
        return list(self.db.scalars(statement).all())

    def get_active_windows(self) -> list[MaintenancePlan]:
        statement = (
            select(MaintenancePlan)
            .where(MaintenancePlan.status.in_(["pending", "confirmed", "executing"]))
            .order_by(MaintenancePlan.plan_start_time)
        )
        return list(self.db.scalars(statement).all())

    def get_by_device(self, device_id: str) -> list[MaintenancePlan]:
        statement = (
            select(MaintenancePlan)
            .where(MaintenancePlan.device_id == device_id)
            .order_by(MaintenancePlan.plan_start_time.desc())
        )
        return list(self.db.scalars(statement).all())

    def update_plan_status(self, plan_id: str, status: str) -> MaintenancePlan | None:
        plan = self.get(plan_id)
        if plan is None:
            return None
        plan.status = status
        self.db.flush()
        return plan

    def update_plan(self, plan_id: str, **values) -> MaintenancePlan | None:
        plan = self.get(plan_id)
        if plan is None:
            return None
        for key, value in values.items():
            if value is not None and hasattr(plan, key):
                setattr(plan, key, value)
        self.db.flush()
        return plan
