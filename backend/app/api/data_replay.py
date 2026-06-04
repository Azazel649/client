from fastapi import APIRouter, Depends, Query
from redis import Redis
from sqlalchemy.orm import Session

from ..core.security import require_admin
from ..db.mysql import get_db
from ..db.redis import get_redis_client
from ..jobs import data_replay_job
from ..models.user import AdminUser
from ..schemas.data_replay_schema import DataReplayResetResponse, DataReplayStatusResponse, DataReplayStepResponse
from ..services.data_replay_service import DataReplayService

router = APIRouter(prefix="/data-replay", tags=["data-replay"])


def get_data_replay_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis_client)) -> DataReplayService:
    return DataReplayService(db, redis_client)


@router.get("/status", response_model=DataReplayStatusResponse)
def get_replay_status(
    _current_user: AdminUser = Depends(require_admin),
    service: DataReplayService = Depends(get_data_replay_service),
):
    return service.get_status(job_running=data_replay_job.running)


@router.post("/next", response_model=DataReplayStepResponse)
def replay_next_batch(
    batch_size: int | None = Query(default=None, ge=1, le=500),
    prediction_interval: float | None = Query(default=5, ge=1, le=100),
    auto_predict: bool = Query(default=True),
    _current_user: AdminUser = Depends(require_admin),
    service: DataReplayService = Depends(get_data_replay_service),
):
    return service.replay_next_batch(batch_size=batch_size, prediction_interval=prediction_interval, auto_predict=auto_predict)


@router.post("/reset", response_model=DataReplayResetResponse)
def reset_replay_pointer(
    pointer: int = Query(default=0, ge=0),
    _current_user: AdminUser = Depends(require_admin),
    service: DataReplayService = Depends(get_data_replay_service),
):
    return service.reset_dataset_pointer(pointer)


@router.post("/job/start", response_model=DataReplayStatusResponse)
def start_replay_job(
    _current_user: AdminUser = Depends(require_admin),
    service: DataReplayService = Depends(get_data_replay_service),
):
    data_replay_job.start()
    return service.get_status(job_running=data_replay_job.running)


@router.post("/job/stop", response_model=DataReplayStatusResponse)
async def stop_replay_job(
    _current_user: AdminUser = Depends(require_admin),
    service: DataReplayService = Depends(get_data_replay_service),
):
    await data_replay_job.stop()
    return service.get_status(job_running=data_replay_job.running)
