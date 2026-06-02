from .auth import router as auth_router
from .data_replay import router as data_replay_router
from .devices import router as device_router
from .health import router as health_router
from .maintenance import router as maintenance_router
from .predictions import router as prediction_router
from .schedules import router as schedule_router
from .tasks import router as task_router

__all__ = [
    "auth_router",
    "data_replay_router",
    "device_router",
    "health_router",
    "maintenance_router",
    "prediction_router",
    "schedule_router",
    "task_router",
]
