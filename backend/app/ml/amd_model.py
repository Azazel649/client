from pathlib import Path

from ..two_stage_l_prediction.two_stage_predictor import Stage1Prediction, predict_first_stage


class AmdModel:
    def __init__(self, project_root: Path, checkpoint_root: Path, model_name: str):
        self.project_root = project_root
        self.checkpoint_root = checkpoint_root
        self.model_name = model_name

    def predict(
        self,
        history_csv: Path,
        query_wear: float,
        machine_type: str,
        max_rollout_steps: int,
        allow_calibrated_extension: bool = True,
    ) -> Stage1Prediction:
        return predict_first_stage(
            project_root=self.project_root,
            checkpoint_root=self.checkpoint_root,
            model_name=self.model_name,
            history_csv=history_csv,
            query_wear=query_wear,
            machine_type=machine_type,
            max_rollout_steps=max_rollout_steps,
            allow_calibrated_extension=allow_calibrated_extension,
        )
