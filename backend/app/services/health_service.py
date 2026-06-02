from datetime import datetime

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.health.health_evaluation_pipeline import HealthEvaluationPipeline
from ..models.health import HealthRecord
from ..models.prediction import PredictionResult
from ..repositories.device_repository import DeviceRepository
from ..repositories.health_repository import HealthRepository
from ..repositories.prediction_repository import PredictionRepository
from ..schemas.health_schema import HealthEvaluationResponse, HealthTrendPoint, HealthTrendResponse


class HealthService:
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.predictions = PredictionRepository(db)
        self.health = HealthRepository(db)
        self.pipeline = HealthEvaluationPipeline()

    def evaluate_from_prediction(self, prediction: PredictionResult) -> HealthRecord:
        latest = self.health.get_latest_health(prediction.device_id)
        last_hi = latest.health_index if latest else None
        probabilities = {
            "No Failure": prediction.p_no_failure or 0.0,
            "Heat Dissipation Failure": prediction.p_heat or 0.0,
            "Power Failure": prediction.p_power or 0.0,
            "Overstrain Failure": prediction.p_overstrain or 0.0,
            "Tool Wear Failure": prediction.p_tool_wear or 0.0,
        }
        output = self.pipeline.evaluate(prediction.predicted_params or {}, probabilities, last_health_index=last_hi)
        record = HealthRecord(
            device_id=prediction.device_id,
            eval_time=datetime.now(),
            prediction_id=prediction.id,
            health_index=output.health_index,
            raw_health_index=output.raw_health_index,
            last_health_index=output.last_health_index,
            rul_minutes=output.rul_minutes,
            health_level=output.health_level,
            risk_score=output.risk_score,
            temperature_anomaly=output.temperature_anomaly,
            power_anomaly=output.power_anomaly,
            model_risk=output.model_risk,
            is_abnormal=output.is_abnormal,
        )
        self.health.save_health_record(record)
        self._write_redis(record)
        return record

    def evaluate_latest_prediction(self, device_id: str) -> HealthEvaluationResponse:
        prediction = self.predictions.get_latest_prediction(device_id)
        if prediction is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该设备暂无预测结果")
        return HealthEvaluationResponse.model_validate(self.evaluate_from_prediction(prediction))

    def get_latest_health(self, device_id: str) -> HealthEvaluationResponse:
        self._require_device(device_id)
        record = self.health.get_latest_health(device_id)
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该设备暂无健康评估记录")
        return HealthEvaluationResponse.model_validate(record)

    def get_health_trend(self, device_id: str, limit: int = 100) -> HealthTrendResponse:
        self._require_device(device_id)
        records = self.health.get_health_trend(device_id, limit)
        return HealthTrendResponse(
            device_id=device_id,
            points=[
                HealthTrendPoint(
                    eval_time=record.eval_time,
                    health_index=record.health_index,
                    rul_minutes=record.rul_minutes,
                    health_level=record.health_level,
                    risk_score=record.risk_score,
                )
                for record in records
            ],
        )

    def get_low_health_devices(self, threshold: float) -> list[HealthEvaluationResponse]:
        return [HealthEvaluationResponse.model_validate(record) for record in self.health.get_devices_below_threshold(threshold)]

    def _require_device(self, device_id: str) -> None:
        if self.devices.get_by_id(device_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")

    def _write_redis(self, record: HealthRecord) -> None:
        key_prefix = f"device:{record.device_id}"
        last_hi = self.redis.get(f"{key_prefix}:hi")
        if last_hi is not None:
            self.redis.set(f"{key_prefix}:last_hi", last_hi)
        self.redis.set(f"{key_prefix}:hi", record.health_index or 0)
        self.redis.set(f"{key_prefix}:rul", record.rul_minutes or 0)
        self.redis.hset(
            f"{key_prefix}:health",
            mapping={
                "health_index": record.health_index or 0,
                "raw_health_index": record.raw_health_index or 0,
                "rul_minutes": record.rul_minutes or 0,
                "health_level": record.health_level or "normal",
                "risk_score": record.risk_score or 0,
                "temperature_anomaly": record.temperature_anomaly or 0,
                "power_anomaly": record.power_anomaly or 0,
                "model_risk": record.model_risk or 0,
                "eval_time": record.eval_time.strftime("%Y-%m-%d %H:%M:%S"),
            },
        )
