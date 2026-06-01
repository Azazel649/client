from sqlalchemy import select

from ..models.model_registry import ModelMetric, ModelRegistry
from .base import BaseRepository


class ModelRegistryRepository(BaseRepository[ModelRegistry]):
    model = ModelRegistry

    def get_active_model(self, model_type: str) -> ModelRegistry | None:
        statement = (
            select(ModelRegistry)
            .where(ModelRegistry.model_type == model_type, ModelRegistry.is_active == 1)
            .order_by(ModelRegistry.create_time.desc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def list_by_type(self, model_type: str) -> list[ModelRegistry]:
        return list(self.db.scalars(select(ModelRegistry).where(ModelRegistry.model_type == model_type)).all())


class ModelMetricRepository(BaseRepository[ModelMetric]):
    model = ModelMetric

    def get_metrics(self, model_id: str) -> list[ModelMetric]:
        statement = select(ModelMetric).where(ModelMetric.model_id == model_id).order_by(ModelMetric.eval_time.desc())
        return list(self.db.scalars(statement).all())
