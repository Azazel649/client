from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from two_stage_predictor import run_two_stage_prediction, save_prediction_outputs


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project_root', type=str, required=True)
    parser.add_argument('--checkpoint_dir', type=str, required=True)
    parser.add_argument('--name', type=str, default='pm_amd_v3')
    parser.add_argument('--machine_type', type=str, default='L')
    parser.add_argument('--history_csv', type=str, required=True)
    parser.add_argument('--query_wear', type=float, required=True)
    parser.add_argument('--cycle_offset', type=int, default=None)
    parser.add_argument('--second_stage_model', type=str, required=True)
    parser.add_argument('--trainer_script', type=str, default=None)
    parser.add_argument('--output_dir', type=str, required=True)
    return parser.parse_args()


def main(args):
    stage1, result = run_two_stage_prediction(
        project_root=args.project_root,
        checkpoint_root=args.checkpoint_dir,
        model_name=args.name,
        history_csv=args.history_csv,
        query_wear=args.query_wear,
        second_stage_model_path=args.second_stage_model,
        trainer_script=args.trainer_script,
        cycle_offset=args.cycle_offset,
        machine_type=args.machine_type,
    )
    save_prediction_outputs(stage1, result, args.output_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(parse_args())
