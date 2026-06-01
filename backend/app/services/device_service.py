from datetime import datetime, timedelta

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..models.device import DeviceInfo
from ..repositories.device_repository import DeviceRepository
from ..repositories.operation_repository import OperationRepository
from ..schemas.device_schema import (
    DeviceCurrentStatusResponse,
    DeviceDetailResponse,
    DeviceResponse,
    OperationTrendResponse,
)


class DeviceService:
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.operations = OperationRepository(db)

    def list_devices(self) -> list[DeviceResponse]:
        return [DeviceResponse.model_validate(device) for device in self.devices.get_all_devices()]

    def get_device_detail(self, device_id: str) -> DeviceDetailResponse:
        device = self._require_device(device_id)
        return DeviceDetailResponse(
            device=DeviceResponse.model_validate(device),
            current_status=self.get_current_status(device_id),
        )

    def list_current_status(self) -> list[DeviceCurrentStatusResponse]:
        rows = self.db.execute(text("SELECT * FROM v_device_current_status ORDER BY id")).mappings().all()
        return [self._merge_redis_status(self._status_from_row(row)) for row in rows]

    def get_current_status(self, device_id: str) -> DeviceCurrentStatusResponse | None:
        row = self.db.execute(
            text("SELECT * FROM v_device_current_status WHERE id = :device_id"),
            {"device_id": device_id},
        ).mappings().first()
        if row is None:
            return None
        return self._merge_redis_status(self._status_from_row(row))

    def update_status(self, device_id: str, status_value: str) -> DeviceResponse:
        device = self.devices.update_status(device_id, status_value)
        if device is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")
        self.redis.hset(f"device:{device_id}:state", mapping={"status": status_value, "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
        return DeviceResponse.model_validate(device)

    def get_operation_trend(
        self,
        device_id: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
    ) -> OperationTrendResponse:
        self._require_device(device_id)
        if start_time is None and end_time is None:
            points = self.operations.get_recent_logs(device_id, limit)
        else:
            end_time = end_time or datetime.now()
            start_time = start_time or (end_time - timedelta(hours=24))
            points = self.operations.get_operation_trend(device_id, start_time, end_time)
        return OperationTrendResponse(device_id=device_id, points=points)

    def _require_device(self, device_id: str) -> DeviceInfo:
        device = self.devices.get_by_id(device_id)
        if device is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")
        return device

    def _merge_redis_status(self, status_data: DeviceCurrentStatusResponse) -> DeviceCurrentStatusResponse:
        device_id = status_data.id
        state = self.redis.hgetall(f"device:{device_id}:state")
        prediction = self.redis.hgetall(f"device:{device_id}:prediction")
        hi = self.redis.get(f"device:{device_id}:hi")
        rul = self.redis.get(f"device:{device_id}:rul")
        load = self.redis.hgetall(f"device:{device_id}:load")

        updates = {}
        if state:
            updates.update(
                {
                    "status": state.get("status", status_data.status),
                    "air_temperature": _float_or_default(state.get("air_temp"), status_data.air_temperature),
                    "process_temperature": _float_or_default(state.get("process_temp"), status_data.process_temperature),
                    "rotational_speed": int(_float_or_default(state.get("rotational_speed"), status_data.rotational_speed)),
                    "torque": _float_or_default(state.get("torque"), status_data.torque),
                    "tool_wear": int(_float_or_default(state.get("tool_wear"), status_data.tool_wear)),
                    "updated_at": _parse_datetime(state.get("updated_at")) or status_data.updated_at,
                }
            )
        if prediction:
            updates.update(
                {
                    "latest_fault_type": prediction.get("fault_type", status_data.latest_fault_type),
                    "latest_fault_probability": _float_or_default(prediction.get("probability"), status_data.latest_fault_probability),
                }
            )
        if hi is not None:
            health_index = _float_or_default(hi, status_data.health_index)
            updates["health_index"] = health_index
            updates["health_level"] = _health_level(health_index)
        if rul is not None:
            updates["rul_hours"] = round(_float_or_default(rul, status_data.rul_hours * 60) / 60, 2)
        if load:
            updates["load_rate"] = _float_or_default(load.get("load_rate"), status_data.load_rate)

        return status_data.model_copy(update=updates)

    @staticmethod
    def _status_from_row(row) -> DeviceCurrentStatusResponse:
        return DeviceCurrentStatusResponse(
            id=row["id"],
            name=row["name"],
            device_type=row.get("device_type"),
            workshop=row.get("workshop"),
            status=row["status"],
            health_index=float(row["health_index"] or 0),
            health_level=row["health_level"] or "normal",
            rul_hours=float(row["rul_hours"] or 0),
            risk_score=float(row["risk_score"] or 0),
            air_temperature=float(row["air_temperature"] or 0),
            process_temperature=float(row["process_temperature"] or 0),
            rotational_speed=int(row["rotational_speed"] or 0),
            torque=float(row["torque"] or 0),
            tool_wear=int(row["tool_wear"] or 0),
            latest_fault_type=row["latest_fault_type"] or "No Failure",
            latest_fault_probability=float(row["latest_fault_probability"] or 0),
            load_rate=float(row["load_rate"] or 0),
            updated_at=row.get("updated_at"),
        )


def _float_or_default(value, default: float) -> float:
    try:
        if value is None:
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def _health_level(health_index: float) -> str:
    if health_index < 30:
        return "danger"
    if health_index < 70:
        return "warning"
    return "normal"
