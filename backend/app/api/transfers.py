from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.transfer_schema import MonitorCheckResponse, TransferExecuteResponse, TransferPlanRequest, TransferPlanResponse
from ..services.load_monitor_service import LoadMonitorService
from ..services.task_transfer_service import TaskTransferService
from ..websocket.manager import websocket_manager

router = APIRouter(prefix="/transfers", tags=["transfers"])


def get_monitor_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> LoadMonitorService:
    return LoadMonitorService(db, redis_client)


def get_transfer_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> TaskTransferService:
    return TaskTransferService(db, redis_client)


@router.post("/monitor/check", response_model=MonitorCheckResponse)
def check_hi_anomalies(
    _current_user: AdminUser = Depends(require_admin),
    service: LoadMonitorService = Depends(get_monitor_service),
):
    return service.check_all_devices()


@router.post("/{device_id}/plan", response_model=TransferPlanResponse)
def generate_transfer_plan(
    device_id: str,
    payload: TransferPlanRequest,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskTransferService = Depends(get_transfer_service),
):
    return service.generate_transfer_plan(device_id, payload)


@router.get("/{device_id}/plan", response_model=TransferPlanResponse)
def get_cached_transfer_plan(
    device_id: str,
    _current_user: AdminUser = Depends(require_admin),
    service: TaskTransferService = Depends(get_transfer_service),
):
    return service.get_cached_transfer_plan(device_id)


@router.post("/{device_id}/execute", response_model=TransferExecuteResponse)
def execute_transfer_plan(
    device_id: str,
    current_user: AdminUser = Depends(require_admin),
    service: TaskTransferService = Depends(get_transfer_service),
):
    return service.execute_transfer(device_id, operator=current_user.username)


@router.websocket("/ws")
async def transfer_alert_socket(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
