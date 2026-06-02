from pathlib import Path

import pandas as pd

from ..two_stage_l_prediction.two_stage_predictor import FEATURE_COLUMNS, build_or_load_second_stage_predictor


class TabpfnModel:
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self._predictor = None

    @property
    def predictor(self):
        if self._predictor is None:
            self._predictor = build_or_load_second_stage_predictor(self.model_path)
        return self._predictor

    def classify(self, feature_vector: dict) -> tuple[str, dict[str, float]]:
        label = self.predictor.predict_one({column: feature_vector[column] for column in FEATURE_COLUMNS})
        probabilities = self._probabilities(feature_vector, label)
        return label, probabilities

    def _probabilities(self, feature_vector: dict, label: str) -> dict[str, float]:
        model = getattr(self.predictor, "model", getattr(self.predictor, "rf_model", None))
        label_encoder = getattr(self.predictor, "label_encoder", None)
        if model is not None and label_encoder is not None and hasattr(model, "predict_proba"):
            frame = pd.DataFrame([{column: feature_vector[column] for column in FEATURE_COLUMNS}])
            proba = model.predict_proba(frame)[0]
            labels = label_encoder.inverse_transform(list(range(len(proba))))
            return _complete_probabilities(dict(zip(labels, [float(value) for value in proba])), label)
        return _heuristic_probabilities(feature_vector, label)


def _complete_probabilities(values: dict[str, float], label: str) -> dict[str, float]:
    normalized = {
        "No Failure": values.get("No Failure", 0.0),
        "Heat Dissipation Failure": values.get("Heat Dissipation Failure", 0.0),
        "Power Failure": values.get("Power Failure", 0.0),
        "Overstrain Failure": values.get("Overstrain Failure", 0.0),
        "Tool Wear Failure": values.get("Tool Wear Failure", 0.0),
    }
    if max(normalized.values()) <= 0:
        return _heuristic_probabilities({}, label)
    total = sum(normalized.values()) or 1
    return {key: round(value / total, 4) for key, value in normalized.items()}


def _heuristic_probabilities(feature_vector: dict, label: str) -> dict[str, float]:
    temp_gap = float(feature_vector.get("Process temperature [K]", 0)) - float(feature_vector.get("Air temperature [K]", 0))
    rpm = float(feature_vector.get("Rotational speed [rpm]", 0))
    torque = float(feature_vector.get("Torque [Nm]", 0))
    wear = float(feature_vector.get("Tool wear [min]", 0))
    power_w = torque * rpm * 2 * 3.141592653589793 / 60
    heat = min(0.95, max(0.02, (8.6 - temp_gap) / 8.6)) if temp_gap < 8.6 else 0.04
    power = min(0.95, max(0.03, abs(power_w - 6000) / 6000))
    overstrain = min(0.95, max(0.02, (torque * wear - 11000) / 11000))
    tool = min(0.95, max(0.03, wear / 240))
    values = {
        "No Failure": 0.9,
        "Heat Dissipation Failure": heat,
        "Power Failure": power,
        "Overstrain Failure": overstrain,
        "Tool Wear Failure": tool,
    }
    if label != "No Failure":
        values["No Failure"] = 0.18
        values[label] = max(values.get(label, 0.0), 0.72)
    else:
        failure_max = max(value for key, value in values.items() if key != "No Failure")
        values["No Failure"] = max(0.1, 1 - failure_max)
    total = sum(values.values()) or 1
    return {key: round(value / total, 4) for key, value in values.items()}
