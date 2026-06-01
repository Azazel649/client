from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class AlertEvent(Base):
    __tablename__ = "alert_event"

    alert_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    device_id: Mapped[str | None] = mapped_column(ForeignKey("device_info.device_id", ondelete="SET NULL", onupdate="CASCADE"), index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("production_task.task_id", ondelete="SET NULL", onupdate="CASCADE"))
    alert_type: Mapped[str] = mapped_column(String(32), index=True)
    alert_level: Mapped[str] = mapped_column(String(16), index=True)
    message: Mapped[str] = mapped_column(String(255))
    related_data: Mapped[dict | None] = mapped_column(JSON)
    is_handled: Mapped[int] = mapped_column(default=0, index=True)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    handled_by: Mapped[str | None] = mapped_column(String(32))
    handled_time: Mapped[datetime | None] = mapped_column(DateTime)
