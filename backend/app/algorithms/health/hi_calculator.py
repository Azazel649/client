from ...core.config import settings


def calc_health_index(
    temperature_anomaly: float,
    power_anomaly: float,
    model_risk: float,
    wear: float,
    last_health_index: float | None = None,
) -> tuple[float, float, float]:
    wear_risk = max(0.0, min(1.0, wear / 240))
    risk_score = (
        0.20 * temperature_anomaly
        + 0.20 * power_anomaly
        + 0.40 * model_risk
        + 0.20 * wear_risk
    )
    raw_hi = max(0.0, min(100.0, 100 * (1 - risk_score)))
    if last_health_index is None:
        return round(raw_hi, 2), round(raw_hi, 2), round(risk_score, 4)
    smoothed = 0.65 * raw_hi + 0.35 * last_health_index
    return round(max(0.0, min(100.0, smoothed)), 2), round(raw_hi, 2), round(risk_score, 4)


def health_level(health_index: float) -> str:
    if health_index < settings.hi_danger_threshold:
        return "danger"
    if health_index < settings.hi_warning_threshold:
        return "warning"
    return "normal"
