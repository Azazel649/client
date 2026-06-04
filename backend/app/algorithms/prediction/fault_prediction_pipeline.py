from dataclasses import dataclass
from datetime import datetime, timedelta

from ...core.config import settings
from ...ml import model_manager
from ...two_stage_l_prediction.two_stage_predictor import FEATURE_COLUMNS, interpolate_at_wear, split_into_cycles
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
        allow_calibrated_extension: bool = True,
        max_rollout_steps: int | None = None,
    ) -> FaultPredictionOutput:
        query_wear = float(query_wear or settings.prediction_default_query_wear)
        history_path = self.sequence_builder.build_sequence(history_csv)
        amd = model_manager.get_active_amd_model()
        tabpfn = model_manager.get_active_tabpfn_model()

        stage1 = amd.predict(
            history_csv=history_path,
            query_wear=query_wear,
            machine_type=machine_type,
            max_rollout_steps=max_rollout_steps or settings.prediction_max_rollout_steps,
            allow_calibrated_extension=allow_calibrated_extension,
        )
        predicted_params = {column: float(stage1.query_result[column]) for column in FEATURE_COLUMNS}
        fault_type, probabilities, probability = self._classify(predicted_params)

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

    def run_short_horizon_predictions(
        self,
        device_id: str,
        machine_type: str,
        interval_wear: float,
        history_csv: str | None = None,
    ) -> list[FaultPredictionOutput]:
        interval_wear = max(float(interval_wear), 1.0)
        history_path = self.sequence_builder.build_sequence(history_csv)
        amd = model_manager.get_active_amd_model()

        seed_query = self._history_current_wear(history_path) + interval_wear
        stage1 = amd.predict(
            history_csv=history_path,
            query_wear=seed_query,
            machine_type=machine_type,
            max_rollout_steps=4,
            allow_calibrated_extension=False,
        )
        current_wear = float(stage1.query_result.get("current_wear", self._history_current_wear(history_path)))
        forecast = split_into_cycles(stage1.forecast)
        candidate = forecast[forecast["cycle_offset"] == 0].reset_index(drop=True)
        if candidate.empty:
            candidate = forecast.reset_index(drop=True)

        future_wear = candidate["Tool wear [min]"].astype(float)
        if future_wear.empty:
            return []
        limit_wear = float(future_wear.max())
        if limit_wear <= current_wear:
            limit_wear = float(future_wear.iloc[-1])
        query_wears = self._build_query_wears(current_wear, limit_wear, interval_wear)

        predict_time = datetime.now()
        outputs: list[FaultPredictionOutput] = []
        for query_wear in query_wears:
            query_result = interpolate_at_wear(candidate, query_wear)
            query_result["current_wear"] = current_wear
            query_result["cycle_offset_used"] = 0
            query_result["machine_type"] = machine_type.upper()
            query_result["rollout_steps"] = int(len(candidate))
            query_result["used_calibrated_extension"] = False
            query_result["auto_prediction"] = True
            predicted_params = {column: float(query_result[column]) for column in FEATURE_COLUMNS}
            fault_type, probabilities, probability = self._classify(predicted_params)
            horizon = max(0, round(predicted_params["Tool wear [min]"] - current_wear))
            outputs.append(
                FaultPredictionOutput(
                    predict_time=predict_time,
                    target_timestamp=predict_time + timedelta(minutes=horizon),
                    forecast_horizon=horizon,
                    fault_type=fault_type,
                    probability=round(float(probability), 4),
                    probabilities=probabilities,
                    predicted_params=predicted_params,
                    model_version=f"{settings.model_name}_{machine_type.upper()}_auto4",
                    stage1_result=query_result,
                    forecast_rows=stage1.forecast.to_dict(orient="records"),
                )
            )
        return outputs

    def _classify(self, predicted_params: dict) -> tuple[str, dict[str, float], float]:
        tabpfn = model_manager.get_active_tabpfn_model()
        fault_type, probabilities = tabpfn.classify(predicted_params)
        probability = max(value for key, value in probabilities.items() if key != "No Failure")
        if fault_type != "No Failure":
            probability = probabilities.get(fault_type, probability)
        return fault_type, probabilities, probability

    @staticmethod
    def _build_query_wears(current_wear: float, limit_wear: float, interval_wear: float) -> list[float]:
        if limit_wear <= current_wear:
            return [round(limit_wear, 4)]
        values: list[float] = []
        next_wear = current_wear + interval_wear
        while next_wear < limit_wear - 1e-6:
            values.append(round(next_wear, 4))
            next_wear += interval_wear
        if not values or abs(values[-1] - limit_wear) > 1e-6:
            values.append(round(limit_wear, 4))
        return values

    @staticmethod
    def _history_current_wear(history_path) -> float:
        import pandas as pd

        history = pd.read_csv(history_path)
        return float(history["Tool wear [min]"].iloc[-1])
