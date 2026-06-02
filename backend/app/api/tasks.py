from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..models.user import AdminUser
from ..schemas.task_schema import (
    ProductionTaskCreate,
    ProductionTaskResponse,
    ProductionTaskUpdate,
    TaskQueueResponse,
)
from ..services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(db: Session = Depends(get_db)) -> TaskService:
    return TaskService(db)


@router.get("", response_model=list[ProductionTaskResponse])
def list_tasks(
    status_value: str | None = Query(default=None, alias="status"),
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    return service.list_tasks(status_value)


@router.post("", response_model=ProductionTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: ProductionTaskCreate,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    return service.create_task(payload)


@router.get("/pending", response_model=list[ProductionTaskResponse])
def get_pending_tasks(
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    return service.get_pending_tasks()


@router.get("/device/{device_id}", response_model=TaskQueueResponse)
def get_tasks_by_device(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    return service.get_tasks_by_device(device_id)


@router.patch("/{task_id}", response_model=ProductionTaskResponse)
def update_task(
    task_id: str,
    payload: ProductionTaskUpdate,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    return service.update_task(task_id, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskService = Depends(get_task_service),
):
    service.delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
