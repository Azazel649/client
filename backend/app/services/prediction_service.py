from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.prediction.fault_prediction_pipeline import FaultPredictionPipeline
from ..models.prediction import PredictionResult
from ..repositories.device_repository import DeviceRepository
from ..repositories.prediction_repository import PredictionRepository
from ..schemas.prediction_schema import FaultProbabilityResponse, PredictionResultResponse, PredictionRunResponse
from .health_service import HealthService


class PredictionService:
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.predictions = PredictionRepository(db)
        self.pipeline = FaultPredictionPipeline()
        self.health_service = HealthService(db, redis_client)

    def execute_prediction(
        self,
        device_id: str,
        query_wear: float | None = None,
        machine_type: str | None = None,
        history_csv: str | None = None,
    ) -> PredictionRunResponse:
        device = self.devices.get_by_id(device_id)
        if device is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")
        machine_type = (machine_type or device.device_type or "L").upper()
        output = self.pipeline.run_fault_prediction(
            device_id=device_id,
            machine_type=machine_type,
            query_wear=query_wear,
            history_csv=history_csv,
        )
        prediction = PredictionResult(
            device_id=device_id,
            predict_time=output.predict_time,
            target_timestamp=output.target_timestamp,
            forecast_horizon=output.forecast_horizon,
            fault_type=output.fault_type,
            probability=output.probability,
            p_no_failure=output.probabilities.get("No Failure"),
            p_heat=output.probabilities.get("Heat Dissipation Failure"),
            p_power=output.probabilities.get("Power Failure"),
            p_overstrain=output.probabilities.get("Overstrain Failure"),
            p_tool_wear=output.probabilities.get("Tool Wear Failure"),
            predicted_params=output.predicted_params,
            model_version=output.model_version,
        )
        self.predictions.save_prediction_result(prediction)
        self._write_prediction_cache(prediction)
        health_record = self.health_service.evaluate_from_prediction(prediction)
        return PredictionRunResponse(
            prediction=PredictionResultResponse.model_validate(prediction),
            health=self.health_service.get_latest_health(health_record.device_id),
            stage1_query_result=output.stage1_result,
        )

    def get_latest_prediction(self, device_id: str) -> PredictionResultResponse:
        self._require_device(device_id)
        prediction = self.predictions.get_latest_prediction(device_id)
        if prediction is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该设备暂无预测结果")
        return PredictionResultResponse.model_validate(prediction)

    def get_prediction_history(self, device_id: str, limit: int = 50) -> list[PredictionResultResponse]:
        self._require_device(device_id)
        return [PredictionResultResponse.model_validate(item) for item in self.predictions.get_prediction_history(device_id, limit)]

    def get_fault_probabilities(self, device_id: str) -> FaultProbabilityResponse:
        prediction = self.predictions.get_latest_prediction(device_id)
        if prediction is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该设备暂无预测结果")
        return FaultProbabilityResponse(
            device_id=device_id,
            p_no_failure=prediction.p_no_failure or 0,
            p_heat=prediction.p_heat or 0,
            p_power=prediction.p_power or 0,
            p_overstrain=prediction.p_overstrain or 0,
            p_tool_wear=prediction.p_tool_wear or 0,
        )

    def _require_device(self, device_id: str) -> None:
        if self.devices.get_by_id(device_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")

    def _write_prediction_cache(self, prediction: PredictionResult) -> None:
        self.redis.hset(
            f"device:{prediction.device_id}:prediction",
            mapping={
                "fault_type": prediction.fault_type or "No Failure",
                "probability": prediction.probability or 0,
                "p_no_failure": prediction.p_no_failure or 0,
                "p_heat": prediction.p_heat or 0,
                "p_power": prediction.p_power or 0,
                "p_overstrain": prediction.p_overstrain or 0,
                "p_tool_wear": prediction.p_tool_wear or 0,
                "target_timestamp": prediction.target_timestamp.strftime("%Y-%m-%d %H:%M:%S") if prediction.target_timestamp else "",
                "model_version": prediction.model_version or "",
            },
        )
