from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class PredictionResult(Base):
    __tablename__ = "prediction_result"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("device_info.device_id", ondelete="CASCADE", onupdate="CASCADE"), index=True)
    predict_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    target_timestamp: Mapped[datetime | None] = mapped_column(DateTime)
    forecast_horizon: Mapped[int | None] = mapped_column(Integer)
    fault_type: Mapped[str | None] = mapped_column(String(32), index=True)
    probability: Mapped[float | None] = mapped_column(Float)
    p_no_failure: Mapped[float | None] = mapped_column(Float)
    p_heat: Mapped[float | None] = mapped_column(Float)
    p_power: Mapped[float | None] = mapped_column(Float)
    p_overstrain: Mapped[float | None] = mapped_column(Float)
    p_tool_wear: Mapped[float | None] = mapped_column(Float)
    predicted_params: Mapped[dict | None] = mapped_column(JSON)
    model_version: Mapped[str | None] = mapped_column(String(32))
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
