from sqlalchemy import select

from ..models.task import ProductionTask
from .base import BaseRepository


class TaskRepository(BaseRepository[ProductionTask]):
    model = ProductionTask

    def get_pending_tasks(self) -> list[ProductionTask]:
        statement = (
            select(ProductionTask)
            .where(ProductionTask.status.in_(["pending", "running", "paused"]))
            .order_by(ProductionTask.priority.desc(), ProductionTask.due_time)
        )
        return list(self.db.scalars(statement).all())

    def list_tasks(self, status: str | None = None) -> list[ProductionTask]:
        statement = select(ProductionTask)
        if status is not None:
            statement = statement.where(ProductionTask.status == status)
        statement = statement.order_by(ProductionTask.create_time.desc())
        return list(self.db.scalars(statement).all())

    def get_tasks_by_device(self, device_id: str) -> list[ProductionTask]:
        statement = (
            select(ProductionTask)
            .where(ProductionTask.assigned_device == device_id)
            .order_by(ProductionTask.start_time, ProductionTask.priority.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_unfinished_tasks(self, device_id: str) -> list[ProductionTask]:
        statement = (
            select(ProductionTask)
            .where(
                ProductionTask.assigned_device == device_id,
                ProductionTask.status.in_(["pending", "running", "paused"]),
            )
            .order_by(ProductionTask.priority.desc(), ProductionTask.due_time)
        )
        return list(self.db.scalars(statement).all())

    def update_task_assignment(self, task_id: str, device_id: str | None, start_time=None, end_time=None) -> ProductionTask | None:
        task = self.get(task_id)
        if task is None:
            return None
        task.assigned_device = device_id
        if start_time is not None:
            task.start_time = start_time
        if end_time is not None:
            task.end_time = end_time
        self.db.flush()
        return task

    def update_task(self, task_id: str, **values) -> ProductionTask | None:
        task = self.get(task_id)
        if task is None:
            return None
        for key, value in values.items():
            if value is not None and hasattr(task, key):
                setattr(task, key, value)
        self.db.flush()
        return task
