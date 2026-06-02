from .auth import router as auth_router
from .data_replay import router as data_replay_router
from .devices import router as device_router
from .health import router as health_router
from .predictions import router as prediction_router

__all__ = ["auth_router", "data_replay_router", "device_router", "health_router", "prediction_router"]
