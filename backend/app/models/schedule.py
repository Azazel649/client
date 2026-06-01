from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class SchedulePlan(Base):
    __tablename__ = "schedule_plan"

    plan_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    plan_type: Mapped[str] = mapped_column(String(32), index=True)
    plan_name: Mapped[str | None] = mapped_column(String(64))
    total_delay: Mapped[int] = mapped_column(Integer, default=0)
    makespan: Mapped[int | None] = mapped_column(Integer)
    avg_load_rate: Mapped[float | None] = mapped_column(Float)
    load_balance_score: Mapped[float | None] = mapped_column(Float)
    health_match_score: Mapped[float | None] = mapped_column(Float)
    high_risk_load_rate: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    algorithm: Mapped[str | None] = mapped_column(String(32))
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    confirmed_by: Mapped[str | None] = mapped_column(String(32))
    confirmed_time: Mapped[datetime | None] = mapped_column(DateTime)
    remark: Mapped[str | None] = mapped_column(String(255))


class SchedulePlanItem(Base):
    __tablename__ = "schedule_plan_item"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("schedule_plan.plan_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("production_task.task_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("device_info.device_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    original_device_id: Mapped[str | None] = mapped_column(ForeignKey("device_info.device_id", ondelete="SET NULL", onupdate="CASCADE"))
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    is_adjusted: Mapped[int] = mapped_column(default=0)
    item_type: Mapped[str] = mapped_column(String(16), default="production")
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ScheduleLog(Base):
    __tablename__ = "schedule_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    schedule_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("schedule_plan.plan_id", ondelete="SET NULL", onupdate="CASCADE"))
    task_id: Mapped[str] = mapped_column(ForeignKey("production_task.task_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    from_device: Mapped[str | None] = mapped_column(ForeignKey("device_info.device_id", ondelete="SET NULL", onupdate="CASCADE"))
    to_device: Mapped[str | None] = mapped_column(ForeignKey("device_info.device_id", ondelete="SET NULL", onupdate="CASCADE"))
    reason: Mapped[str | None] = mapped_column(String(64))
    operator: Mapped[str | None] = mapped_column(String(32))
    detail: Mapped[dict | None] = mapped_column(JSON)
