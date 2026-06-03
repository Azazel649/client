import type { HealthEvaluation } from "./health";

export interface PredictionResult {
  id: number;
  device_id: string;
  predict_time: string;
  target_timestamp: string | null;
  forecast_horizon: number | null;
  fault_type: string | null;
  probability: number | null;
  p_no_failure: number | null;
  p_heat: number | null;
  p_power: number | null;
  p_overstrain: number | null;
  p_tool_wear: number | null;
  predicted_params: Record<string, unknown> | null;
  model_version: string | null;
}

export interface FaultProbability {
  device_id: string;
  p_no_failure: number;
  p_heat: number;
  p_power: number;
  p_overstrain: number;
  p_tool_wear: number;
}

export interface PredictionRun {
  prediction: PredictionResult;
  health: HealthEvaluation;
  stage1_query_result: Record<string, unknown>;
}

export interface PredictionTriggerRequest {
  query_wear?: number;
  machine_type?: "L" | "M" | "H" | "l" | "m" | "h";
  history_csv?: string;
}
