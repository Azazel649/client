from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from redis import Redis
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.operation import OperationLog
from ..repositories.device_repository import DeviceRepository
from ..repositories.operation_repository import OperationRepository
from ..schemas.data_replay_schema import (
    DataReplayResetResponse,
    DataReplayStatusResponse,
    DataReplayStepResponse,
    ReplayedOperationResponse,
)

FEATURE_ALIASES = {
    "air_temp": ("Air temperature [K]", "air_temp", "air_temperature"),
    "process_temp": ("Process temperature [K]", "process_temp", "process_temperature"),
    "rotational_speed": ("Rotational speed [rpm]", "rotational_speed", "rotational_speed[rpm]"),
    "torque": ("Torque [Nm]", "torque", "torque[nm]"),
    "tool_wear": ("Tool wear [min]", "tool_wear", "tool_wear[min]"),
}


@dataclass(frozen=True)
class ReplayRow:
    air_temp: float
    process_temp: float
    rotational_speed: int
    torque: float
    tool_wear: int
    raw_device_id: str | None = None
    raw_timestamp: datetime | None = None


class DataReplayService:
    pointer_key = "data_replay:pointer"
    total_rows_key = "data_replay:total_rows"

    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.operations = OperationRepository(db)

    def replay_next_batch(self, batch_size: int | None = None) -> DataReplayStepResponse:
        rows = self._load_rows()
        if not rows:
            return DataReplayStepResponse(pointer_before=0, pointer_after=0, wrapped=False, rows_replayed=0, operations=[])

        batch_size = batch_size or settings.data_replay_batch_size
        pointer_before = self.get_pointer()
        pointer = pointer_before
        wrapped = False
        outputs: list[ReplayedOperationResponse] = []
        device_ids = self._resolve_device_ids()

        for batch_index in range(batch_size):
            if pointer >= len(rows):
                pointer = 0
                wrapped = True
            row = rows[pointer]
            device_id = row.raw_device_id if row.raw_device_id and self.devices.get_by_id(row.raw_device_id) else device_ids[batch_index % len(device_ids)]
            timestamp = row.raw_timestamp or datetime.now()
            operation = OperationLog(
                device_id=device_id,
                timestamp=timestamp,
                air_temp=row.air_temp,
                process_temp=row.process_temp,
                rotational_speed=row.rotational_speed,
                torque=row.torque,
                tool_wear=row.tool_wear,
                source="replay",
            )
            self.operations.insert_operation_log(operation)
            self._write_redis_state(operation)
            outputs.append(
                ReplayedOperationResponse(
                    device_id=device_id,
                    timestamp=timestamp,
                    air_temp=row.air_temp,
                    process_temp=row.process_temp,
                    rotational_speed=row.rotational_speed,
                    torque=row.torque,
                    tool_wear=row.tool_wear,
                )
            )
            pointer += 1

        if pointer >= len(rows):
            pointer = 0
            wrapped = True
        self.set_pointer(pointer)
        self.redis.set(self.total_rows_key, len(rows))

        return DataReplayStepResponse(
            pointer_before=pointer_before,
            pointer_after=pointer,
            wrapped=wrapped,
            rows_replayed=len(outputs),
            operations=outputs,
        )

    def get_status(self, job_running: bool = False) -> DataReplayStatusResponse:
        csv_path = self._csv_path()
        rows = self._load_rows() if csv_path.exists() else []
        self.redis.set(self.total_rows_key, len(rows))
        return DataReplayStatusResponse(
            csv_path=str(csv_path),
            exists=csv_path.exists(),
            total_rows=len(rows),
            pointer=self.get_pointer(),
            device_ids=self._resolve_device_ids(),
            interval_seconds=settings.data_replay_interval,
            auto_start=settings.data_replay_auto_start,
            job_running=job_running,
        )

    def reset_dataset_pointer(self, pointer: int = 0) -> DataReplayResetResponse:
        rows = self._load_rows()
        if rows:
            pointer = max(0, min(pointer, len(rows) - 1))
        else:
            pointer = 0
        self.set_pointer(pointer)
        return DataReplayResetResponse(pointer=pointer, message="数据回放指针已重置")

    def get_pointer(self) -> int:
        value = self.redis.get(self.pointer_key)
        try:
            return int(value or 0)
        except ValueError:
            return 0

    def set_pointer(self, pointer: int) -> None:
        self.redis.set(self.pointer_key, pointer)

    def _load_rows(self) -> list[ReplayRow]:
        csv_path = self._csv_path()
        if not csv_path.exists():
            return []
        rows: list[ReplayRow] = []
        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for raw in reader:
                rows.append(self._parse_row(raw))
        return rows

    def _parse_row(self, raw: dict[str, Any]) -> ReplayRow:
        normalized = {str(key).strip(): value for key, value in raw.items()}
        lower_map = {key.lower(): key for key in normalized}

        def get_value(name: str) -> str:
            for alias in FEATURE_ALIASES[name]:
                key = lower_map.get(alias.lower())
                if key is not None and normalized.get(key) not in (None, ""):
                    return str(normalized[key])
            raise ValueError(f"CSV 缺少字段: {FEATURE_ALIASES[name][0]}")

        device_id = _optional_value(normalized, lower_map, ["device_id", "Device ID", "machine_id"])
        timestamp_text = _optional_value(normalized, lower_map, ["timestamp", "time", "datetime"])
        return ReplayRow(
            air_temp=float(get_value("air_temp")),
            process_temp=float(get_value("process_temp")),
            rotational_speed=int(float(get_value("rotational_speed"))),
            torque=float(get_value("torque")),
            tool_wear=int(float(get_value("tool_wear"))),
            raw_device_id=device_id,
            raw_timestamp=_parse_datetime(timestamp_text),
        )

    def _resolve_device_ids(self) -> list[str]:
        configured = [device_id for device_id in settings.data_replay_device_ids if self.devices.get_by_id(device_id)]
        if configured:
            return configured
        redis_devices = [device_id for device_id in self.redis.smembers("mes:devices") if self.devices.get_by_id(str(device_id))]
        if redis_devices:
            return sorted(str(device_id) for device_id in redis_devices)
        database_devices = self.devices.get_all_devices()
        if database_devices:
            return [database_devices[0].device_id]
        raise ValueError("没有可用于数据回放的设备")

    def _write_redis_state(self, operation: OperationLog) -> None:
        mapping = {
            "device_id": operation.device_id,
            "status": "running",
            "air_temp": operation.air_temp,
            "process_temp": operation.process_temp,
            "rotational_speed": operation.rotational_speed,
            "torque": operation.torque,
            "tool_wear": operation.tool_wear,
            "updated_at": operation.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.redis.hset(f"device:{operation.device_id}:state", mapping=mapping)
        self.redis.sadd("mes:devices", operation.device_id)

    @staticmethod
    def _csv_path() -> Path:
        path = Path(settings.data_replay_csv_path)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        return path


def _optional_value(raw: dict[str, Any], lower_map: dict[str, str], aliases: list[str]) -> str | None:
    for alias in aliases:
        key = lower_map.get(alias.lower())
        if key is not None and raw.get(key) not in (None, ""):
            return str(raw[key])
    return None


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None
