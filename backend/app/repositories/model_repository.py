from sqlalchemy import select, update

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

    def list_models(self, model_type: str | None = None) -> list[ModelRegistry]:
        statement = select(ModelRegistry)
        if model_type is not None:
            statement = statement.where(ModelRegistry.model_type == model_type)
        statement = statement.order_by(ModelRegistry.model_type, ModelRegistry.create_time.desc())
        return list(self.db.scalars(statement).all())

    def get_by_type_version(self, model_type: str, version: str) -> ModelRegistry | None:
        statement = select(ModelRegistry).where(ModelRegistry.model_type == model_type, ModelRegistry.version == version)
        return self.db.scalar(statement)

    def activate_model(self, model_id: str) -> ModelRegistry | None:
        model = self.get(model_id)
        if model is None:
            return None
        self.db.execute(update(ModelRegistry).where(ModelRegistry.model_type == model.model_type).values(is_active=0))
        model.is_active = 1
        self.db.flush()
        return model


class ModelMetricRepository(BaseRepository[ModelMetric]):
    model = ModelMetric

    def get_metrics(self, model_id: str) -> list[ModelMetric]:
        statement = select(ModelMetric).where(ModelMetric.model_id == model_id).order_by(ModelMetric.eval_time.desc())
        return list(self.db.scalars(statement).all())
