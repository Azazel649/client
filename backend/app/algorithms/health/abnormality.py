def calc_temperature_gap(air_temp: float, process_temp: float) -> float:
    return process_temp - air_temp


def calc_mechanical_power(rotational_speed: float, torque: float) -> float:
    return torque * rotational_speed * 2 * 3.141592653589793 / 60


def calc_temperature_anomaly(temp_gap: float, normal_low: float = 8.6, normal_high: float = 12.0) -> float:
    if normal_low <= temp_gap <= normal_high:
        return 0.0
    if temp_gap < normal_low:
        return _clamp((normal_low - temp_gap) / normal_low)
    return _clamp((temp_gap - normal_high) / normal_high)


def calc_power_anomaly(power_w: float, normal_low: float = 3500, normal_high: float = 9000) -> float:
    if normal_low <= power_w <= normal_high:
        return 0.0
    if power_w < normal_low:
        return _clamp((normal_low - power_w) / normal_low)
    return _clamp((power_w - normal_high) / normal_high)


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))
