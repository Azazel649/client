from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from ..core.config import settings

engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def init_mysql() -> Engine:
    global engine, SessionLocal
    if engine is None:
        engine = create_engine(
            settings.mysql_url,
            pool_pre_ping=True,
            pool_recycle=settings.mysql_pool_recycle,
            pool_size=settings.mysql_pool_size,
            max_overflow=settings.mysql_max_overflow,
            future=True,
        )
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return engine


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        init_mysql()
    assert SessionLocal is not None
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def ping_mysql() -> bool:
    try:
        current_engine = init_mysql()
        with current_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def close_mysql() -> None:
    global engine, SessionLocal
    if engine is not None:
        engine.dispose()
    engine = None
    SessionLocal = None
