from __future__ import annotations

from dataclasses import dataclass
import importlib.util
import json
from pathlib import Path
import sys
import types
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd

try:
    import torch
except ImportError:  # pragma: no cover
    torch = None


FEATURE_COLUMNS = [
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]',
]
TARGET_COLUMNS = FEATURE_COLUMNS[:-1]


@dataclass
class Stage1Prediction:
    history: pd.DataFrame
    forecast: pd.DataFrame
    query_result: Dict[str, Any]
    config: Dict[str, Any]


def ensure_path(path: str | Path) -> Path:
    resolved = Path(path)
    if not resolved.exists():
        raise FileNotFoundError(f'Path not found: {resolved}')
    return resolved


def _load_module_from_file(fullname: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(fullname, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f'Could not import {fullname} from {file_path}')
    module = importlib.util.module_from_spec(spec)
    sys.modules[fullname] = module
    spec.loader.exec_module(module)
    return module


def load_amd_module(project_root: Path):
    search_roots = [project_root, project_root.parent, Path.cwd(), Path.cwd().parent]

    for root in search_roots:
        models_dir = root / 'models'
        if (models_dir / 'common.py').exists() and (models_dir / 'tsmoe.py').exists() and (models_dir / 'tsAMD.py').exists():
            package = types.ModuleType('models')
            package.__path__ = [str(models_dir)]  # type: ignore[attr-defined]
            sys.modules['models'] = package
            _load_module_from_file('models.common', models_dir / 'common.py')
            _load_module_from_file('models.tsmoe', models_dir / 'tsmoe.py')
            module = _load_module_from_file('models.tsAMD', models_dir / 'tsAMD.py')
            return module.AMD

        if (root / 'common.py').exists() and (root / 'tsmoe.py').exists() and (root / 'tsAMD.py').exists():
            package = types.ModuleType('models')
            package.__path__ = [str(root)]  # type: ignore[attr-defined]
            sys.modules['models'] = package
            _load_module_from_file('models.common', root / 'common.py')
            _load_module_from_file('models.tsmoe', root / 'tsmoe.py')
            module = _load_module_from_file('models.tsAMD', root / 'tsAMD.py')
            return module.AMD

    raise ImportError(
        'Could not locate AMD source files. Expected models/common.py, '
        'models/tsmoe.py, and models/tsAMD.py under project_root or its parent.'
    )


def load_checkpoint_bundle(project_root: Path, checkpoint_dir: Path):
    AMD = load_amd_module(project_root)
    with open(checkpoint_dir / 'config.json', 'r', encoding='utf-8') as file:
        config = json.load(file)
    with open(checkpoint_dir / 'data_meta.json', 'r', encoding='utf-8') as file:
        meta = json.load(file)

    model = AMD(
        input_shape=(config['seq_len'], config['n_feature']),
        pred_len=config['pred_len'],
        dropout=config['dropout'],
        n_block=config['n_block'],
        patch=config['patch'],
        k=config['mix_layer_num'],
        c=config['mix_layer_scale'],
        alpha=config['alpha'],
        target_slice=slice(0, config['n_feature']),
        norm=config['norm'],
        layernorm=config['layernorm'],
    )
    state = torch.load(checkpoint_dir / 'best.pt', map_location='cpu')
    model.load_state_dict(state)
    model.eval()

    mean = np.array(meta['mean'], dtype=np.float32)
    std = np.array(meta['std'], dtype=np.float32)
    std = np.where(np.abs(std) < 1e-8, 1.0, std)
    return model, config, meta, mean, std


def scale(values: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return (values - mean) / std


def inverse_transform(values: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return values * std + mean


def load_history(history_csv: str | Path, seq_len: int) -> pd.DataFrame:
    df = pd.read_csv(history_csv)
    missing = [column for column in FEATURE_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f'History file missing columns: {missing}')
    if len(df) < seq_len:
        raise ValueError(f'History rows ({len(df)}) < seq_len ({seq_len})')
    return df.tail(seq_len).reset_index(drop=True)


def split_into_cycles(forecast_df: pd.DataFrame) -> pd.DataFrame:
    wear = forecast_df['Tool wear [min]'].to_numpy()
    cycle_ids = np.zeros(len(forecast_df), dtype=int)
    current_cycle = 0

    for index in range(1, len(forecast_df)):
        if wear[index] < wear[index - 1]:
            current_cycle += 1
        cycle_ids[index] = current_cycle

    output = forecast_df.copy()
    output['cycle_offset'] = cycle_ids
    return output


def pick_cycle_for_query(current_wear: float, query_wear: float, cycle_offset: Optional[int]) -> int:
    if cycle_offset is not None:
        return int(cycle_offset)
    return 0 if query_wear >= current_wear else 1


def interpolate_at_wear(cycle_df: pd.DataFrame, query_wear: float) -> Dict[str, Any]:
    wear = cycle_df['Tool wear [min]'].to_numpy()
    if len(wear) == 0:
        raise ValueError('Candidate cycle is empty')
    if len(wear) == 1:
        row = cycle_df.iloc[0]
        output: Dict[str, Any] = {
            'match_mode': 'single_step',
            'matched_step': 0,
            'query_wear': float(query_wear),
            'warning': 'forecast cycle has only one step; returned that step',
        }
        for column in FEATURE_COLUMNS:
            output[column] = float(row[column])
        return output

    for index in range(len(wear) - 1):
        wear_0, wear_1 = wear[index], wear[index + 1]
        lower, upper = min(wear_0, wear_1), max(wear_0, wear_1)
        if lower <= query_wear <= upper and abs(wear_1 - wear_0) > 1e-8:
            ratio = (query_wear - wear_0) / (wear_1 - wear_0)
            row_0 = cycle_df.iloc[index]
            row_1 = cycle_df.iloc[index + 1]
            output = {
                'match_mode': 'interpolated',
                'matched_between_step': [int(index), int(index + 1)],
                'interp_ratio': float(ratio),
                'query_wear': float(query_wear),
            }
            for column in FEATURE_COLUMNS:
                output[column] = float(row_0[column] + ratio * (row_1[column] - row_0[column]))
            return output

    nearest_index = int(np.argmin(np.abs(wear - query_wear)))
    row = cycle_df.iloc[nearest_index]
    output = {
        'match_mode': 'nearest',
        'matched_step': nearest_index,
        'query_wear': float(query_wear),
        'warning': 'exact crossing not found; returned nearest step',
    }
    for column in FEATURE_COLUMNS:
        output[column] = float(row[column])
    return output


def extend_forecast_to_query_wear(history_df: pd.DataFrame, forecast_df: pd.DataFrame, query_wear: float) -> pd.DataFrame:
    """Extend forecast externally when the trained AMD horizon saturates before the queried wear.

    The AMD checkpoint is trained with a short fixed ``pred_len``. Changing that
    length would invalidate the saved weights, so this keeps the model intact and
    only calibrates the business-facing wear axis when the requested wear lies
    beyond the rolled model path.
    """
    if forecast_df.empty:
        return forecast_df

    current_wear = float(history_df['Tool wear [min]'].iloc[-1])
    forecast_wear = forecast_df['Tool wear [min]'].to_numpy(dtype=float)
    if current_wear <= query_wear <= np.nanmax(forecast_wear):
        return forecast_df
    if query_wear < current_wear and query_wear >= np.nanmin(forecast_wear):
        return forecast_df

    history_wear = history_df['Tool wear [min]'].to_numpy(dtype=float)
    combined_wear = np.concatenate([history_wear, forecast_wear])
    diffs = np.diff(combined_wear)
    if query_wear >= current_wear:
        candidate_diffs = diffs[diffs > 1e-4]
    else:
        candidate_diffs = -diffs[diffs < -1e-4]
    wear_step = float(np.median(candidate_diffs)) if len(candidate_diffs) else 5.0
    wear_step = max(wear_step, 1.0)

    last_row = forecast_df.iloc[-1][FEATURE_COLUMNS].astype(float).to_dict()
    tail = forecast_df[FEATURE_COLUMNS].tail(min(8, len(forecast_df))).astype(float)
    feature_steps = {}
    for column in FEATURE_COLUMNS:
        if column == 'Tool wear [min]':
            continue
        column_diffs = np.diff(tail[column].to_numpy(dtype=float))
        feature_steps[column] = float(np.median(column_diffs)) if len(column_diffs) else 0.0

    rows = []
    next_step = int(forecast_df['forecast_step'].max()) + 1
    direction = 1 if query_wear >= float(last_row['Tool wear [min]']) else -1
    next_wear = float(last_row['Tool wear [min]'])

    while (direction > 0 and next_wear < query_wear) or (direction < 0 and next_wear > query_wear):
        next_wear = next_wear + direction * wear_step
        row = {'forecast_step': next_step}
        for column in FEATURE_COLUMNS:
            if column == 'Tool wear [min]':
                row[column] = min(next_wear, query_wear) if direction > 0 else max(next_wear, query_wear)
            else:
                row[column] = float(last_row[column] + feature_steps[column] * (next_step - int(forecast_df['forecast_step'].max())))
        rows.append(row)
        next_step += 1
        if len(rows) > 512:
            break

    if not rows:
        return forecast_df

    output = pd.concat([forecast_df, pd.DataFrame(rows)], ignore_index=True)
    output['calibrated_extension'] = False
    output.loc[output.index[-len(rows):], 'calibrated_extension'] = True
    return output


def predict_first_stage(
    project_root: str | Path,
    checkpoint_root: str | Path,
    model_name: str,
    history_csv: str | Path,
    query_wear: float,
    cycle_offset: Optional[int] = None,
    machine_type: str = 'L',
    max_rollout_steps: int = 64,
    allow_calibrated_extension: bool = True,
) -> Stage1Prediction:
    project_root = ensure_path(project_root)
    checkpoint_root = ensure_path(checkpoint_root)
    history_csv = ensure_path(history_csv)
    machine_type = machine_type.upper()
    checkpoint_dir = ensure_path(checkpoint_root / f'{model_name}_{machine_type}')

    model, config, _meta, mean, std = load_checkpoint_bundle(project_root, checkpoint_dir)
    history_df = load_history(history_csv, config['seq_len'])

    rollout_limit = max(config['pred_len'], int(max_rollout_steps))
    history_window = history_df[FEATURE_COLUMNS].copy()
    forecast_chunks = []
    total_steps = 0
    current_wear = float(history_df['Tool wear [min]'].iloc[-1])

    while total_steps < rollout_limit:
        history_values = history_window.tail(config['seq_len']).to_numpy(dtype=np.float32)
        history_scaled = scale(history_values, mean, std)

        with torch.no_grad():
            inputs = torch.tensor(history_scaled[None, :, :], dtype=torch.float32)
            forecast_scaled, _ = model(inputs)
            forecast_scaled = forecast_scaled.squeeze(0).cpu().numpy()

        forecast_values = inverse_transform(forecast_scaled, mean, std)
        chunk_df = pd.DataFrame(forecast_values, columns=FEATURE_COLUMNS)
        chunk_df.insert(0, 'forecast_step', np.arange(total_steps + 1, total_steps + len(chunk_df) + 1))
        forecast_chunks.append(chunk_df)
        total_steps += len(chunk_df)

        forecast_df = pd.concat(forecast_chunks, ignore_index=True)
        selected_cycle = pick_cycle_for_query(current_wear, query_wear, cycle_offset)
        cycle_df = split_into_cycles(forecast_df)
        candidate = cycle_df[cycle_df['cycle_offset'] == selected_cycle]
        if not candidate.empty:
            wear = candidate['Tool wear [min]'].to_numpy()
            if np.nanmin(wear) <= query_wear <= np.nanmax(wear):
                forecast_df = candidate.drop(columns=['cycle_offset']).reset_index(drop=True)
                break
            if cycle_df['cycle_offset'].max() > selected_cycle:
                forecast_df = candidate.drop(columns=['cycle_offset']).reset_index(drop=True)
                break

        history_window = pd.concat([history_window, chunk_df[FEATURE_COLUMNS]], ignore_index=True).tail(config['seq_len']).reset_index(drop=True)

        # Stop early if the model has clearly saturated and additional rolling
        # calls are no longer moving tool wear toward the requested point.
        if len(forecast_df) >= config['pred_len'] * 3:
            recent_wear = forecast_df['Tool wear [min]'].tail(config['pred_len'] * 2).to_numpy()
            if query_wear > current_wear and np.nanmax(recent_wear) < query_wear and np.nanmax(np.diff(recent_wear)) <= 1e-4:
                break

    if 'forecast_df' not in locals():
        forecast_df = pd.concat(forecast_chunks, ignore_index=True)
    if allow_calibrated_extension:
        forecast_df = extend_forecast_to_query_wear(history_df, forecast_df, query_wear)
    forecast_df = split_into_cycles(forecast_df)

    selected_cycle = pick_cycle_for_query(current_wear, query_wear, cycle_offset)
    candidate = forecast_df[forecast_df['cycle_offset'] == selected_cycle].reset_index(drop=True)
    if candidate.empty:
        raise ValueError(
            f'No forecasted cycle matches cycle_offset={selected_cycle}. '
            'Increase pred_len or change query_wear.'
        )

    query_result = interpolate_at_wear(candidate, query_wear)
    query_result['current_wear'] = current_wear
    query_result['cycle_offset_used'] = selected_cycle
    query_result['machine_type'] = machine_type
    query_result['rollout_steps'] = int(len(forecast_df))
    query_result['used_calibrated_extension'] = bool(forecast_df.get('calibrated_extension', pd.Series(dtype=bool)).fillna(False).any())

    return Stage1Prediction(
        history=history_df,
        forecast=forecast_df,
        query_result=query_result,
        config=config,
    )


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()
    output['temp_diff'] = output['Process temperature [K]'] - output['Air temperature [K]']
    output['power_w'] = output['Torque [Nm]'] * output['Rotational speed [rpm]'] * 2 * np.pi / 60
    output['strain'] = output['Torque [Nm]'] * output['Tool wear [min]']
    return output


def rule_based_label(row: pd.Series):
    if (row['temp_diff'] < 8.6) and (row['Rotational speed [rpm]'] < 1380):
        return 'Heat Dissipation Failure'
    if (row['power_w'] < 3500) or (row['power_w'] > 9000):
        return 'Power Failure'
    if row['strain'] > 11000:
        return 'Overstrain Failure'
    return None


class HybridPredictor:
    def __init__(self, label_encoder, model):
        self.label_encoder = label_encoder
        # Keep both names for compatibility with old joblib files and newer code.
        self.rf_model = model
        self.model = model

    def _get_model(self):
        """Return the underlying sklearn model, supporting old and new attribute names."""
        model = getattr(self, 'model', None)
        if model is None:
            model = getattr(self, 'rf_model', None)
        if model is None:
            raise AttributeError("HybridPredictor has neither 'model' nor 'rf_model'.")
        return model

    def predict_one(self, record: dict) -> str:
        df = add_engineered_features(pd.DataFrame([record]))
        exact = rule_based_label(df.iloc[0])
        if exact is not None:
            return exact

        model = self._get_model()
        prediction = model.predict(df[FEATURE_COLUMNS])[0]
        return self.label_encoder.inverse_transform([prediction])[0]

    def predict(self, df: pd.DataFrame):
        df_with_features = add_engineered_features(df)
        predictions = []
        fallback_indexes = []

        for index, row in df_with_features.iterrows():
            exact = rule_based_label(row)
            if exact is None:
                predictions.append(None)
                fallback_indexes.append(index)
            else:
                predictions.append(exact)

        if fallback_indexes:
            fallback_frame = df_with_features.loc[fallback_indexes, FEATURE_COLUMNS]
            model = self._get_model()
            fallback_predictions = self.label_encoder.inverse_transform(
                model.predict(fallback_frame)
            )
            for index, prediction in zip(fallback_indexes, fallback_predictions):
                predictions[df_with_features.index.get_loc(index)] = prediction

        return np.array(predictions, dtype=object)


def _limit_parallelism_for_prediction(predictor):
    for attribute in ('model', 'rf_model'):
        model = getattr(predictor, attribute, None)
        if model is not None and hasattr(model, 'n_jobs'):
            model.n_jobs = 1
    return predictor


def _register_hybrid_predictor_for_pickle(trainer_script: Optional[Path] = None):
    if trainer_script is not None:
        trainer_script = ensure_path(trainer_script)
        spec = importlib.util.spec_from_file_location('trainer_for_pickle', str(trainer_script))
        if spec is None or spec.loader is None:
            raise ImportError(f'Could not import trainer script: {trainer_script}')
        module = importlib.util.module_from_spec(spec)
        sys.modules['trainer_for_pickle'] = module
        spec.loader.exec_module(module)
        sys.modules['__main__'].HybridPredictor = module.HybridPredictor
        return

    sys.modules['__main__'].HybridPredictor = HybridPredictor


def _ensure_predictor_model_aliases(predictor):
    """Patch loaded predictors saved by older code versions.

    Older joblib files may contain ``rf_model`` but not ``model``. Current
    prediction code may call either name depending on how the object was
    serialized, so we ensure both aliases exist whenever possible.
    """
    has_model = hasattr(predictor, 'model')
    has_rf_model = hasattr(predictor, 'rf_model')

    if not has_model and has_rf_model:
        predictor.model = predictor.rf_model
    elif has_model and not has_rf_model:
        predictor.rf_model = predictor.model

    return predictor


def build_or_load_second_stage_predictor(model_path: str | Path, trainer_script: str | Path | None = None):
    model_path = ensure_path(model_path)
    trainer_path = Path(trainer_script) if trainer_script else None

    _register_hybrid_predictor_for_pickle(trainer_path)
    loaded = joblib.load(model_path)

    if hasattr(loaded, 'predict_one'):
        loaded = _ensure_predictor_model_aliases(loaded)
        return _limit_parallelism_for_prediction(loaded)
    if isinstance(loaded, dict) and 'label_encoder' in loaded and 'rf_model' in loaded:
        return _limit_parallelism_for_prediction(HybridPredictor(loaded['label_encoder'], loaded['rf_model']))
    if isinstance(loaded, dict) and 'label_encoder' in loaded and 'model' in loaded:
        return _limit_parallelism_for_prediction(HybridPredictor(loaded['label_encoder'], loaded['model']))

    raise ValueError('Second-stage model must expose predict_one(record) or contain label_encoder plus a model.')


def run_two_stage_prediction(
    project_root: str | Path,
    checkpoint_root: str | Path,
    model_name: str,
    history_csv: str | Path,
    query_wear: float,
    second_stage_model_path: str | Path,
    trainer_script: str | Path | None = None,
    cycle_offset: Optional[int] = None,
    machine_type: str = 'L',
    max_rollout_steps: int = 64,
    allow_calibrated_extension: bool = True,
) -> tuple[Stage1Prediction, Dict[str, Any]]:
    stage1 = predict_first_stage(
        project_root=project_root,
        checkpoint_root=checkpoint_root,
        model_name=model_name,
        history_csv=history_csv,
        query_wear=query_wear,
        cycle_offset=cycle_offset,
        machine_type=machine_type,
        max_rollout_steps=max_rollout_steps,
        allow_calibrated_extension=allow_calibrated_extension,
    )
    second_stage_predictor = build_or_load_second_stage_predictor(second_stage_model_path, trainer_script)

    second_stage_input = {
        column: stage1.query_result[column]
        for column in FEATURE_COLUMNS
    }
    failure_prediction = second_stage_predictor.predict_one(second_stage_input)

    result = {
        'stage1_query_result': stage1.query_result,
        'stage2_failure_prediction': failure_prediction,
        'stage2_input_used': second_stage_input,
        'notes': {
            'machine_type_used': machine_type.upper(),
            'stage1_model': f'{model_name}_{machine_type.upper()}',
            'stage2_model_file': str(second_stage_model_path),
            'seq_len': stage1.config['seq_len'],
            'pred_len': stage1.config['pred_len'],
            'rollout_steps': stage1.query_result.get('rollout_steps'),
        },
    }
    return stage1, result


def save_prediction_outputs(stage1: Stage1Prediction, result: Dict[str, Any], output_dir: str | Path) -> None:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    machine_type = result.get('notes', {}).get('machine_type_used', 'L')

    stage1.history.to_csv(output_dir / 'history_tail_used.csv', index=False)
    stage1.forecast.to_csv(output_dir / f'forecast_path_{machine_type}.csv', index=False)
    with open(output_dir / f'two_stage_result_{machine_type}.json', 'w', encoding='utf-8') as file:
        json.dump(result, file, ensure_ascii=False, indent=2)
