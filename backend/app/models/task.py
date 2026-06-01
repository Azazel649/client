from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class ProductionTask(Base):
    __tablename__ = "production_task"

    task_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    task_name: Mapped[str] = mapped_column(String(64))
    product_type: Mapped[str | None] = mapped_column(String(32))
    required_device_type: Mapped[str | None] = mapped_column(String(32), index=True)
    duration: Mapped[int | None] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(default=0, index=True)
    load_weight: Mapped[float] = mapped_column(Float, default=1)
    predecessor_task_id: Mapped[str | None] = mapped_column(ForeignKey("production_task.task_id", ondelete="SET NULL", onupdate="CASCADE"))
    due_time: Mapped[datetime | None] = mapped_column(DateTime)
    assigned_device: Mapped[str | None] = mapped_column(ForeignKey("device_info.device_id", ondelete="SET NULL", onupdate="CASCADE"), index=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime)
    end_time: Mapped[datetime | None] = mapped_column(DateTime)
    actual_start_time: Mapped[datetime | None] = mapped_column(DateTime)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    update_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
