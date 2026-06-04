from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Intelligent MES"
    app_version: str = "1.0.0"
    app_env: str = "development"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 120

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "intelligent_mes"
    mysql_pool_size: int = 10
    mysql_max_overflow: int = 20
    mysql_pool_recycle: int = 1800

    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    redis_decode_responses: bool = True

    amd_checkpoint_path: str = "app/checkpoints"
    tabpfn_model_path: str = "app/l_hybrid_failure_predictor.joblib"
    model_name: str = "pm_amd_v3"
    prediction_history_csv_path: str = "app/history_L.csv"
    prediction_output_dir: str = "../two_stage_output_L"
    prediction_default_query_wear: float = 120
    prediction_max_rollout_steps: int = 64

    data_replay_csv_path: str = "app/stage1_training_data_regenerated_continuous.CSV"
    data_replay_history_csv_path: str = "app/history_L.csv"
    data_replay_device_ids: list[str] = Field(default_factory=lambda: ["CNC-01"])
    data_replay_batch_size: int = 1
    data_replay_auto_start: bool = False
    data_replay_interval: int = 10
    prediction_interval: int = 300
    load_monitor_interval: int = 30

    hi_warning_threshold: float = 70
    hi_danger_threshold: float = 30
    rul_replace_threshold: float = 240
    transfer_hi_drop_threshold: float = 15
    load_rate_limit: float = 0.85

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def mysql_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
