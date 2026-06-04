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
from .prediction_service import PredictionService

FEATURE_ALIASES = {
    "air_temp": ("Air temperature [K]", "air_temp", "air_temperature"),
    "process_temp": ("Process temperature [K]", "process_temp", "process_temperature"),
    "rotational_speed": ("Rotational speed [rpm]", "rotational_speed", "rotational_speed[rpm]"),
    "torque": ("Torque [Nm]", "torque", "torque[nm]"),
    "tool_wear": ("Tool wear [min]", "tool_wear", "tool_wear[min]"),
}
HISTORY_COLUMNS = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]


@dataclass(frozen=True)
class ReplayRow:
    source_index: int
    air_temp: float
    process_temp: float
    rotational_speed: int
    torque: float
    tool_wear: int
    machine_type: str = "L"
    raw_device_id: str | None = None
    raw_timestamp: datetime | None = None

    def history_values(self) -> dict[str, float | int]:
        return {
            "Air temperature [K]": self.air_temp,
            "Process temperature [K]": self.process_temp,
            "Rotational speed [rpm]": self.rotational_speed,
            "Torque [Nm]": self.torque,
            "Tool wear [min]": self.tool_wear,
        }


class DataReplayService:
    pointer_key = "data_replay:pointer"
    total_rows_key = "data_replay:total_rows"

    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.devices = DeviceRepository(db)
        self.operations = OperationRepository(db)
        self.predictions = PredictionService(db, redis_client)

    def replay_next_batch(
        self,
        batch_size: int | None = None,
        prediction_interval: float | None = None,
        auto_predict: bool = True,
    ) -> DataReplayStepResponse:
        rows = self._load_rows()
        if not rows:
            return DataReplayStepResponse(pointer_before=0, pointer_after=0, wrapped=False, rows_replayed=0, operations=[])

        batch_size = batch_size or settings.data_replay_batch_size
        prediction_interval = float(prediction_interval or 5.0)
        pointer_before = self.get_pointer()
        wrapped = False
        outputs: list[ReplayedOperationResponse] = []
        device_ids = self._resolve_device_ids()
        history_before_wear = self._history_current_wear()

        auto_predictions = []
        if auto_predict and batch_size == 1:
            auto_predictions = self.predictions.execute_auto_short_horizon(
                device_id=device_ids[0],
                interval_wear=prediction_interval,
                machine_type="L",
                history_csv=str(self._history_csv_path()),
            )

        next_index = self._next_source_index(rows)
        for batch_index in range(batch_size):
            if next_index >= len(rows):
                next_index = 0
                wrapped = True
            row = rows[next_index]
            device_id = row.raw_device_id if row.raw_device_id and self.devices.get_by_id(row.raw_device_id) else device_ids[batch_index % len(device_ids)]
            timestamp = row.raw_timestamp or datetime.now()
            self._append_history_row(row)
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
            next_index = row.source_index + 1

        if next_index >= len(rows):
            next_index = 0
            wrapped = True
        self.set_pointer(next_index)
        self.redis.set(self.total_rows_key, len(rows))

        prediction_limit = None
        if auto_predictions:
            prediction_limit = max(
                float(item.prediction.predicted_params.get("Tool wear [min]", 0))
                for item in auto_predictions
                if item.prediction.predicted_params
            )

        return DataReplayStepResponse(
            pointer_before=pointer_before,
            pointer_after=next_index,
            wrapped=wrapped,
            rows_replayed=len(outputs),
            operations=outputs,
            history_before_wear=history_before_wear,
            prediction_limit_wear=prediction_limit,
            prediction_interval=prediction_interval if auto_predict else None,
            auto_predictions=auto_predictions,
        )

    def get_status(self, job_running: bool = False) -> DataReplayStatusResponse:
        csv_path = self._csv_path()
        rows = self._load_rows() if csv_path.exists() else []
        self.redis.set(self.total_rows_key, len(rows))
        return DataReplayStatusResponse(
            csv_path=str(csv_path),
            history_csv_path=str(self._history_csv_path()),
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
        return DataReplayResetResponse(pointer=pointer, message="data replay pointer reset")

    def get_pointer(self) -> int:
        value = self.redis.get(self.pointer_key)
        try:
            return int(value or 0)
        except ValueError:
            return 0

    def set_pointer(self, pointer: int) -> None:
        self.redis.set(self.pointer_key, pointer)

    def _next_source_index(self, rows: list[ReplayRow]) -> int:
        history_tail = self._history_tail()
        if history_tail is None:
            return self.get_pointer()

        matched_index = None
        for index, row in enumerate(rows):
            if _same_history_row(history_tail, row):
                matched_index = index
        if matched_index is not None:
            return matched_index + 1

        current_wear = float(history_tail["Tool wear [min]"])
        for index, row in enumerate(rows):
            if row.tool_wear > current_wear:
                return index
        return self.get_pointer()

    def _load_rows(self) -> list[ReplayRow]:
        csv_path = self._csv_path()
        if not csv_path.exists():
            return []
        rows: list[ReplayRow] = []
        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for raw in reader:
                parsed = self._parse_row(raw, len(rows))
                if parsed.machine_type.upper() == "L":
                    rows.append(parsed)
        return rows

    def _parse_row(self, raw: dict[str, Any], source_index: int) -> ReplayRow:
        normalized = {str(key).strip(): value for key, value in raw.items()}
        lower_map = {key.lower(): key for key in normalized}

        def get_value(name: str) -> str:
            for alias in FEATURE_ALIASES[name]:
                key = lower_map.get(alias.lower())
                if key is not None and normalized.get(key) not in (None, ""):
                    return str(normalized[key])
            raise ValueError(f"CSV missing field: {FEATURE_ALIASES[name][0]}")

        device_id = _optional_value(normalized, lower_map, ["device_id", "Device ID", "machine_id"])
        machine_type = _optional_value(normalized, lower_map, ["Type", "type", "machine_type"]) or "L"
        timestamp_text = _optional_value(normalized, lower_map, ["timestamp", "time", "datetime"])
        return ReplayRow(
            source_index=source_index,
            air_temp=float(get_value("air_temp")),
            process_temp=float(get_value("process_temp")),
            rotational_speed=int(float(get_value("rotational_speed"))),
            torque=float(get_value("torque")),
            tool_wear=int(float(get_value("tool_wear"))),
            machine_type=machine_type,
            raw_device_id=device_id,
            raw_timestamp=_parse_datetime(timestamp_text),
        )

    def _append_history_row(self, row: ReplayRow) -> None:
        history_path = self._history_csv_path()
        history_path.parent.mkdir(parents=True, exist_ok=True)
        tail = self._history_tail()
        if tail is not None and _same_history_row(tail, row):
            return
        exists = history_path.exists() and history_path.stat().st_size > 0
        with history_path.open("a", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=HISTORY_COLUMNS)
            if not exists:
                writer.writeheader()
            writer.writerow(row.history_values())

    def _history_tail(self) -> dict[str, float] | None:
        history_path = self._history_csv_path()
        if not history_path.exists():
            return None
        tail = None
        with history_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for raw in reader:
                tail = {column: float(raw[column]) for column in HISTORY_COLUMNS}
        return tail

    def _history_current_wear(self) -> float | None:
        tail = self._history_tail()
        return float(tail["Tool wear [min]"]) if tail else None

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
        raise ValueError("no available replay device")

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
        configured = _resolve_backend_path(settings.data_replay_csv_path)
        fallback = _resolve_backend_path("app/stage1_training_data_regenerated_continuous.CSV")
        if configured.name.lower() == "history_l.csv" and fallback.exists():
            return fallback
        return configured

    @staticmethod
    def _history_csv_path() -> Path:
        return _resolve_backend_path(settings.data_replay_history_csv_path)


def _resolve_backend_path(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    return path


def _same_history_row(tail: dict[str, float], row: ReplayRow) -> bool:
    values = row.history_values()
    return all(abs(float(tail[column]) - float(values[column])) <= 1e-6 for column in HISTORY_COLUMNS)


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
