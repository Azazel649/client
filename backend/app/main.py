from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth_router, device_router
from .core.config import settings
from .db.mysql import close_mysql, init_mysql, ping_mysql
from .db.redis import close_redis, get_redis_client, ping_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_mysql()
    get_redis_client()
    yield
    close_redis()
    close_mysql()


app = FastAPI(
    title=settings.app_name,
    description="基于故障预测的智能化生产执行系统后端",
    version=settings.app_version,
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app.include_router(auth_router)
app.include_router(device_router)


@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_env,
        "mysql": ping_mysql(),
        "redis": ping_redis(),
    }
