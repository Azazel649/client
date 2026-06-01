from .auth import router as auth_router
from .devices import router as device_router

__all__ = ["auth_router", "device_router"]
