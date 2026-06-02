from datetime import datetime
from uuid import uuid4

from redis import Redis
from sqlalchemy.orm import Session

from ..algorithms.transfer.anomaly_detector import AnomalyDetector, AnomalyEvent, HIReading
from ..models.alert import AlertEvent
from ..repositories.alert_repository import AlertRepository
from ..repositories.device_repository import DeviceRepository
from ..repositories.health_repository import HealthRepository
from ..schemas.transfer_schema import HIAnomalyResponse, MonitorCheckResponse
from ..websocket.manager import websocket_manager


class LoadMonitorService:
    def __init__(self, db: Session, redis_client: Redis):
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.health = HealthRepository(db)
        self.alerts = AlertRepository(db)

    def check_all_devices(self, drop_threshold: float = 15.0, critical_hi_threshold: float = 30.0) -> MonitorCheckResponse:
        checked_at = datetime.now()
        readings = [self._read_device_hi(device.device_id, device.status, checked_at) for device in self.devices.get_all_devices()]
        events = AnomalyDetector(drop_threshold, critical_hi_threshold).detect(readings)
        responses = [self._handle_anomaly(event) for event in events]
        return MonitorCheckResponse(checked_at=checked_at, anomalies=responses)

    def _read_device_hi(self, device_id: str, status: str, read_time: datetime) -> HIReading:
        current = self.redis.get(f"device:{device_id}:hi")
        last = self.redis.get(f"device:{device_id}:last_hi")
        if current is None:
            health_hash = self.redis.hgetall(f"device:{device_id}:health")
            current = health_hash.get("health_index") if health_hash else None
        record = self.health.get_latest_health(device_id)
        current_hi = _float_value(current, record.health_index if record else 100.0)
        last_hi = _float_value(last, record.last_health_index if record and record.last_health_index is not None else None)
        return HIReading(device_id=device_id, current_hi=current_hi, last_hi=last_hi, status=status, read_time=read_time)

    def _handle_anomaly(self, event: AnomalyEvent) -> HIAnomalyResponse:
        self.devices.update_status(event.device_id, "locked")
        alert = AlertEvent(
            alert_id=uuid4().hex,
            device_id=event.device_id,
            task_id=None,
            alert_type="hi_drop",
            alert_level=event.alert_level,
            message=f"HI dropped from {event.last_hi:.2f} to {event.current_hi:.2f}",
            related_data={
                "last_hi": event.last_hi,
                "current_hi": event.current_hi,
                "drop_value": event.drop_value,
                "detected_at": event.detected_at.isoformat(),
            },
            is_handled=0,
        )
        self.alerts.save_alert(alert)
        message = {
            "type": "hi_drop_alert",
            "alert_id": alert.alert_id,
            "device_id": event.device_id,
            "current_hi": event.current_hi,
            "last_hi": event.last_hi,
            "drop_value": event.drop_value,
            "alert_level": event.alert_level,
            "detected_at": event.detected_at.isoformat(),
        }
        self.redis.set(f"alert:hi_drop:{event.device_id}", str(message))
        self.redis.hset(
            f"device:{event.device_id}:alert",
            mapping={
                "alert_id": alert.alert_id,
                "alert_type": "hi_drop",
                "current_hi": event.current_hi,
                "last_hi": event.last_hi,
                "drop_value": event.drop_value,
                "detected_at": event.detected_at.isoformat(),
            },
        )
        websocket_manager.remember(message)
        return HIAnomalyResponse(
            device_id=event.device_id,
            current_hi=event.current_hi,
            last_hi=event.last_hi,
            drop_value=event.drop_value,
            alert_level=event.alert_level,
            reason=event.reason,
            detected_at=event.detected_at,
            alert_id=alert.alert_id,
        )


def _float_value(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
