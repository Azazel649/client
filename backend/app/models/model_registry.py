from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    __table_args__ = (UniqueConstraint("model_type", "version", name="uk_model_type_version"),)

    model_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(64))
    model_type: Mapped[str] = mapped_column(String(32), index=True)
    version: Mapped[str] = mapped_column(String(32))
    file_path: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[int] = mapped_column(default=0, index=True)
    description: Mapped[str | None] = mapped_column(String(255))
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ModelMetric(Base):
    __tablename__ = "model_metric"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("model_registry.model_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    metric_name: Mapped[str] = mapped_column(String(32))
    metric_value: Mapped[float] = mapped_column(Float)
    dataset_name: Mapped[str | None] = mapped_column(String(64))
    eval_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
