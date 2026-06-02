from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..models.user import AdminUser
from ..schemas.dispatch_schema import DispatchDeviceState, DispatchPlanResponse, DispatchRunRequest
from ..services.dispatch_service import DispatchService

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


def get_dispatch_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> DispatchService:
    return DispatchService(db, redis_client)


@router.post("/run", response_model=DispatchPlanResponse)
def run_adaptive_dispatch(
    payload: DispatchRunRequest,
    current_user: AdminUser = Depends(require_admin),
    service: DispatchService = Depends(get_dispatch_service),
):
    return service.run_dispatch(payload, operator=current_user.username)


@router.get("/current", response_model=DispatchPlanResponse)
def get_current_dispatch(
    _current_user: AdminUser = Depends(require_admin),
    service: DispatchService = Depends(get_dispatch_service),
):
    return service.get_current_dispatch()


@router.get("/devices", response_model=list[DispatchDeviceState])
def get_dispatch_device_states(
    _current_user: AdminUser = Depends(require_admin),
    service: DispatchService = Depends(get_dispatch_service),
):
    return service.get_device_states()
