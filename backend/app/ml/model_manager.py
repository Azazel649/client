from pathlib import Path

from ..core.config import settings
from .amd_model import AmdModel
from .tabpfn_model import TabpfnModel


class ModelManager:
    def __init__(self):
        self.backend_root = Path(__file__).resolve().parents[2]
        self._amd: AmdModel | None = None
        self._tabpfn: TabpfnModel | None = None

    def get_active_amd_model(self) -> AmdModel:
        if self._amd is None:
            self._amd = AmdModel(
                project_root=self._resolve(settings.amd_checkpoint_path).parent,
                checkpoint_root=self._resolve(settings.amd_checkpoint_path),
                model_name=settings.model_name,
            )
        return self._amd

    def get_active_tabpfn_model(self) -> TabpfnModel:
        if self._tabpfn is None:
            self._tabpfn = TabpfnModel(self._resolve(settings.tabpfn_model_path))
        return self._tabpfn

    def reload_models(self) -> None:
        self._amd = None
        self._tabpfn = None

    def _resolve(self, value: str) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = self.backend_root / path
        return path


model_manager = ModelManager()
