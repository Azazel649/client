from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class HealthRecord(Base):
    __tablename__ = "health_record"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("device_info.device_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    eval_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    prediction_id: Mapped[int | None] = mapped_column(ForeignKey("prediction_result.id", ondelete="SET NULL", onupdate="CASCADE"))
    health_index: Mapped[float | None] = mapped_column(Float)
    raw_health_index: Mapped[float | None] = mapped_column(Float)
    last_health_index: Mapped[float | None] = mapped_column(Float)
    rul_minutes: Mapped[float | None] = mapped_column(Float)
    health_level: Mapped[str | None] = mapped_column(String(16), index=True)
    risk_score: Mapped[float | None] = mapped_column(Float)
    temperature_anomaly: Mapped[float | None] = mapped_column(Float)
    power_anomaly: Mapped[float | None] = mapped_column(Float)
    model_risk: Mapped[float | None] = mapped_column(Float)
    is_abnormal: Mapped[int] = mapped_column(default=0)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
