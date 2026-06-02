from pathlib import Path

from ...core.config import settings


class SequenceBuilder:
    """Resolve the history sequence source used by the existing predictor.

    The current model entrypoint consumes a CSV history file. We keep that
    contract intact in step four instead of replacing it with a tensor builder.
    """

    def __init__(self):
        self.backend_root = Path(__file__).resolve().parents[3]

    def build_sequence(self, history_csv: str | None = None) -> Path:
        path = Path(history_csv or settings.prediction_history_csv_path)
        if not path.is_absolute():
            path = self.backend_root / path
        if not path.exists():
            raise FileNotFoundError(f"历史数据文件不存在: {path}")
        return path
