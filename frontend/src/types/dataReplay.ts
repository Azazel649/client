import type { PredictionRun } from "./prediction";

export interface ReplayedOperation {
  device_id: string;
  timestamp: string;
  air_temp: number;
  process_temp: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  source: string;
}

export interface DataReplayStep {
  pointer_before: number;
  pointer_after: number;
  wrapped: boolean;
  rows_replayed: number;
  operations: ReplayedOperation[];
  history_before_wear: number | null;
  prediction_limit_wear: number | null;
  prediction_interval: number | null;
  auto_predictions: PredictionRun[];
}

export interface DataReplayStatus {
  csv_path: string;
  history_csv_path: string | null;
  exists: boolean;
  total_rows: number;
  pointer: number;
  device_ids: string[];
  interval_seconds: number;
  auto_start: boolean;
  job_running: boolean;
}
