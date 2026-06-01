from sqlalchemy import select

from ..models.prediction import PredictionResult
from .base import BaseRepository


class PredictionRepository(BaseRepository[PredictionResult]):
    model = PredictionResult

    def save_prediction_result(self, prediction: PredictionResult) -> PredictionResult:
        return self.add(prediction)

    def get_latest_prediction(self, device_id: str) -> PredictionResult | None:
        statement = (
            select(PredictionResult)
            .where(PredictionResult.device_id == device_id)
            .order_by(PredictionResult.predict_time.desc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def get_prediction_history(self, device_id: str, limit: int = 50) -> list[PredictionResult]:
        statement = (
            select(PredictionResult)
            .where(PredictionResult.device_id == device_id)
            .order_by(PredictionResult.predict_time.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())
