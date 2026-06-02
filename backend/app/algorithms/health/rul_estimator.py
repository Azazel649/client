def estimate_rul_minutes(
    tool_wear: float,
    p_overstrain: float,
    p_tool_wear: float,
    wear_limit: float = 240,
) -> float:
    base_rul = max(0.0, wear_limit - tool_wear)
    risk_factor = 1 + 0.8 * p_overstrain + 1.2 * p_tool_wear
    return round(base_rul / risk_factor, 2)
