from redis import Redis

from ..core.config import settings

_redis_client: Redis | None = None


def get_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=settings.redis_decode_responses,
        )
    return _redis_client


def ping_redis() -> bool:
    try:
        return bool(get_redis_client().ping())
    except Exception:
        return False


def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        _redis_client.close()
    _redis_client = None
