from ..models.system_config import SystemConfig
from .base import BaseRepository


class ConfigRepository(BaseRepository[SystemConfig]):
    model = SystemConfig

    def get_value(self, key: str, default: str | None = None) -> str | None:
        config = self.get(key)
        return config.config_value if config is not None else default

    def set_value(self, key: str, value: str, description: str | None = None) -> SystemConfig:
        config = self.get(key)
        if config is None:
            config = SystemConfig(config_key=key, config_value=value, description=description)
            self.db.add(config)
        else:
            config.config_value = value
            if description is not None:
                config.description = description
        self.db.flush()
        return config
