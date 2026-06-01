from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class OperationLog(Base):
    __tablename__ = "operation_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("device_info.device_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    air_temp: Mapped[float | None] = mapped_column(Float)
    process_temp: Mapped[float | None] = mapped_column(Float)
    rotational_speed: Mapped[int | None] = mapped_column(Integer)
    torque: Mapped[float | None] = mapped_column(Float)
    tool_wear: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(16), default="replay")
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
