from sqlalchemy import select

from ..models.device import DeviceInfo
from .base import BaseRepository


class DeviceRepository(BaseRepository[DeviceInfo]):
    model = DeviceInfo

    def get_by_id(self, device_id: str) -> DeviceInfo | None:
        return self.db.get(DeviceInfo, device_id)

    def get_all_devices(self) -> list[DeviceInfo]:
        return list(self.db.scalars(select(DeviceInfo).order_by(DeviceInfo.device_id)).all())

    def get_available_devices(self) -> list[DeviceInfo]:
        return list(
            self.db.scalars(
                select(DeviceInfo)
                .where(DeviceInfo.status.in_(["running", "idle"]))
                .order_by(DeviceInfo.device_id)
            ).all()
        )

    def get_locked_devices(self) -> list[DeviceInfo]:
        return list(self.db.scalars(select(DeviceInfo).where(DeviceInfo.status == "locked")).all())

    def update_status(self, device_id: str, status: str) -> DeviceInfo | None:
        device = self.get_by_id(device_id)
        if device is None:
            return None
        device.status = status
        self.db.flush()
        return device
