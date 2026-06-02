from dataclasses import dataclass
from datetime import datetime, timedelta

from ...core.config import settings
from ...ml import model_manager
from ...two_stage_l_prediction.two_stage_predictor import FEATURE_COLUMNS
from .sequence_builder import SequenceBuilder


@dataclass
class FaultPredictionOutput:
    predict_time: datetime
    target_timestamp: datetime
    forecast_horizon: int
    fault_type: str
    probability: float
    probabilities: dict[str, float]
    predicted_params: dict
    model_version: str
    stage1_result: dict
    forecast_rows: list[dict]


class FaultPredictionPipeline:
    def __init__(self):
        self.sequence_builder = SequenceBuilder()

    def run_fault_prediction(
        self,
        device_id: str,
        machine_type: str,
        query_wear: float | None = None,
        history_csv: str | None = None,
    ) -> FaultPredictionOutput:
        query_wear = float(query_wear or settings.prediction_default_query_wear)
        history_path = self.sequence_builder.build_sequence(history_csv)
        amd = model_manager.get_active_amd_model()
        tabpfn = model_manager.get_active_tabpfn_model()

        stage1 = amd.predict(
            history_csv=history_path,
            query_wear=query_wear,
            machine_type=machine_type,
            max_rollout_steps=settings.prediction_max_rollout_steps,
        )
        predicted_params = {column: float(stage1.query_result[column]) for column in FEATURE_COLUMNS}
        fault_type, probabilities = tabpfn.classify(predicted_params)
        probability = max(value for key, value in probabilities.items() if key != "No Failure")
        if fault_type != "No Failure":
            probability = probabilities.get(fault_type, probability)

        current_wear = float(stage1.query_result.get("current_wear", predicted_params["Tool wear [min]"]))
        horizon = max(0, round(predicted_params["Tool wear [min]"] - current_wear))
        predict_time = datetime.now()

        return FaultPredictionOutput(
            predict_time=predict_time,
            target_timestamp=predict_time + timedelta(minutes=horizon),
            forecast_horizon=horizon,
            fault_type=fault_type,
            probability=round(float(probability), 4),
            probabilities=probabilities,
            predicted_params=predicted_params,
            model_version=f"{settings.model_name}_{machine_type.upper()}",
            stage1_result=stage1.query_result,
            forecast_rows=stage1.forecast.to_dict(orient="records"),
        )
