from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class HIReading:
    device_id: str
    current_hi: float
    last_hi: float | None
    status: str
    read_time: datetime


@dataclass(frozen=True)
class AnomalyEvent:
    device_id: str
    current_hi: float
    last_hi: float
    drop_value: float
    alert_level: str
    reason: str
    detected_at: datetime


class AnomalyDetector:
    def __init__(self, drop_threshold: float = 15.0, critical_hi_threshold: float = 30.0):
        self.drop_threshold = drop_threshold
        self.critical_hi_threshold = critical_hi_threshold

    def detect(self, readings: list[HIReading]) -> list[AnomalyEvent]:
        events: list[AnomalyEvent] = []
        for reading in readings:
            if reading.last_hi is None:
                continue
            drop_value = reading.last_hi - reading.current_hi
            if drop_value > self.drop_threshold and reading.current_hi < self.critical_hi_threshold:
                events.append(
                    AnomalyEvent(
                        device_id=reading.device_id,
                        current_hi=reading.current_hi,
                        last_hi=reading.last_hi,
                        drop_value=round(drop_value, 4),
                        alert_level="critical",
                        reason="hi_drop",
                        detected_at=reading.read_time,
                    )
                )
        return events
