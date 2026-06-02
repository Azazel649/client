from dataclasses import dataclass

from .abnormality import (
    calc_mechanical_power,
    calc_power_anomaly,
    calc_temperature_anomaly,
    calc_temperature_gap,
)
from .hi_calculator import calc_health_index, health_level
from .rul_estimator import estimate_rul_minutes


@dataclass
class HealthEvaluationOutput:
    health_index: float
    raw_health_index: float
    last_health_index: float | None
    rul_minutes: float
    health_level: str
    risk_score: float
    temperature_anomaly: float
    power_anomaly: float
    model_risk: float
    is_abnormal: int


class HealthEvaluationPipeline:
    def evaluate(
        self,
        predicted_params: dict,
        probabilities: dict[str, float],
        last_health_index: float | None = None,
    ) -> HealthEvaluationOutput:
        temp_gap = calc_temperature_gap(
            predicted_params["Air temperature [K]"],
            predicted_params["Process temperature [K]"],
        )
        power_w = calc_mechanical_power(
            predicted_params["Rotational speed [rpm]"],
            predicted_params["Torque [Nm]"],
        )
        temperature_anomaly = calc_temperature_anomaly(temp_gap)
        power_anomaly = calc_power_anomaly(power_w)
        model_risk = max(
            probabilities.get("Heat Dissipation Failure", 0.0),
            probabilities.get("Power Failure", 0.0),
            probabilities.get("Overstrain Failure", 0.0),
            probabilities.get("Tool Wear Failure", 0.0),
        )
        health_index, raw_hi, risk_score = calc_health_index(
            temperature_anomaly=temperature_anomaly,
            power_anomaly=power_anomaly,
            model_risk=model_risk,
            wear=predicted_params["Tool wear [min]"],
            last_health_index=last_health_index,
        )
        rul = estimate_rul_minutes(
            tool_wear=predicted_params["Tool wear [min]"],
            p_overstrain=probabilities.get("Overstrain Failure", 0.0),
            p_tool_wear=probabilities.get("Tool Wear Failure", 0.0),
        )
        level = health_level(health_index)
        return HealthEvaluationOutput(
            health_index=health_index,
            raw_health_index=raw_hi,
            last_health_index=last_health_index,
            rul_minutes=rul,
            health_level=level,
            risk_score=risk_score,
            temperature_anomaly=round(temperature_anomaly, 4),
            power_anomaly=round(power_anomaly, 4),
            model_risk=round(model_risk, 4),
            is_abnormal=1 if level != "normal" else 0,
        )
