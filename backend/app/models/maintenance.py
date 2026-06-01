from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class MaintenancePlan(Base):
    __tablename__ = "maintenance_plan"

    plan_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("device_info.device_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    plan_start_time: Mapped[datetime] = mapped_column(DateTime)
    plan_end_time: Mapped[datetime] = mapped_column(DateTime)
    maintenance_type: Mapped[str | None] = mapped_column(String(16))
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    deadline: Mapped[datetime | None] = mapped_column(DateTime)
    risk_level: Mapped[str | None] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(16), default="auto")
    reason: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    update_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
