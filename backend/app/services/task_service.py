from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.task import ProductionTask
from ..repositories.device_repository import DeviceRepository
from ..repositories.task_repository import TaskRepository
from ..schemas.task_schema import (
    ProductionTaskCreate,
    ProductionTaskResponse,
    ProductionTaskUpdate,
    TaskQueueResponse,
)


class TaskService:
    def __init__(self, db: Session):
        self.tasks = TaskRepository(db)
        self.devices = DeviceRepository(db)

    def list_tasks(self, status_value: str | None = None) -> list[ProductionTaskResponse]:
        return [ProductionTaskResponse.model_validate(task) for task in self.tasks.list_tasks(status_value)]

    def create_task(self, payload: ProductionTaskCreate) -> ProductionTaskResponse:
        if self.tasks.get(payload.task_id) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="task already exists")
        if payload.assigned_device and self.devices.get_by_id(payload.assigned_device) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assigned device not found")
        task = ProductionTask(**payload.model_dump())
        self.tasks.add(task)
        return ProductionTaskResponse.model_validate(task)

    def update_task(self, task_id: str, payload: ProductionTaskUpdate) -> ProductionTaskResponse:
        values = payload.model_dump(exclude_unset=True)
        if values.get("assigned_device") and self.devices.get_by_id(values["assigned_device"]) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assigned device not found")
        task = self.tasks.update_task(task_id, **values)
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
        return ProductionTaskResponse.model_validate(task)

    def delete_task(self, task_id: str) -> None:
        task = self.tasks.get(task_id)
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
        self.tasks.delete(task)

    def get_pending_tasks(self) -> list[ProductionTaskResponse]:
        return [ProductionTaskResponse.model_validate(task) for task in self.tasks.get_pending_tasks()]

    def get_tasks_by_device(self, device_id: str) -> TaskQueueResponse:
        if self.devices.get_by_id(device_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="device not found")
        return TaskQueueResponse(
            device_id=device_id,
            tasks=[ProductionTaskResponse.model_validate(task) for task in self.tasks.get_tasks_by_device(device_id)],
        )
