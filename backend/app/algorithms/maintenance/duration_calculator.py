def calculate_maintenance_duration(maintenance_type: str, risk_level: str) -> int:
    if maintenance_type == "replace":
        return 90 if risk_level == "high" else 60
    if maintenance_type == "repair":
        return 60 if risk_level == "high" else 30
    return 30
