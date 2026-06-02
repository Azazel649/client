from dataclasses import dataclass

from ...core.config import settings


@dataclass(frozen=True)
class MaintenanceDecision:
    should_generate: bool
    maintenance_type: str | None
    risk_level: str | None
    reason: str


def decide_maintenance(
    health_index: float | None,
    rul_minutes: float | None,
    fault_type: str | None,
    fault_probability: float | None,
) -> MaintenanceDecision:
    health_index = 100.0 if health_index is None else float(health_index)
    rul_minutes = float("inf") if rul_minutes is None else float(rul_minutes)
    fault_probability = 0.0 if fault_probability is None else float(fault_probability)
    fault_type = fault_type or "No Failure"

    if rul_minutes <= settings.rul_replace_threshold:
        risk_level = "high" if rul_minutes <= settings.rul_replace_threshold / 2 else "medium"
        return MaintenanceDecision(
            should_generate=True,
            maintenance_type="replace",
            risk_level=risk_level,
            reason=f"RUL={rul_minutes:.0f} 分钟，低于更换阈值 {settings.rul_replace_threshold:.0f} 分钟，建议生成更换窗口。",
        )

    if health_index < settings.hi_danger_threshold:
        return MaintenanceDecision(
            should_generate=True,
            maintenance_type="repair",
            risk_level="high",
            reason=f"HI={health_index:.1f}，低于高风险阈值 {settings.hi_danger_threshold:.0f}，建议立即检修。",
        )

    if health_index < settings.hi_warning_threshold:
        return MaintenanceDecision(
            should_generate=True,
            maintenance_type="repair",
            risk_level="medium",
            reason=f"HI={health_index:.1f}，低于预警阈值 {settings.hi_warning_threshold:.0f}，建议安排检修窗口。",
        )

    if fault_type != "No Failure" and fault_probability >= 0.5:
        return MaintenanceDecision(
            should_generate=True,
            maintenance_type="repair",
            risk_level="medium",
            reason=f"预测故障类型为 {fault_type}，故障概率 {fault_probability:.2f}，建议预防性检修。",
        )

    return MaintenanceDecision(
        should_generate=False,
        maintenance_type=None,
        risk_level=None,
        reason="当前 HI、RUL 与故障风险均未达到维护窗口生成条件。",
    )
