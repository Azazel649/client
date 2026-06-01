from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class DeviceInfo(Base):
    __tablename__ = "device_info"

    device_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    device_name: Mapped[str] = mapped_column(String(64))
    device_type: Mapped[str | None] = mapped_column(String(32), index=True)
    workshop: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="running", index=True)
    rated_power: Mapped[float | None] = mapped_column(Float)
    max_load_rate: Mapped[float | None] = mapped_column(Float, default=1)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    update_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
