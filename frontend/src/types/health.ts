export interface HealthEvaluation {
  id: number;
  device_id: string;
  eval_time: string;
  prediction_id: number | null;
  health_index: number | null;
  raw_health_index: number | null;
  last_health_index: number | null;
  rul_minutes: number | null;
  health_level: string | null;
  risk_score: number | null;
  temperature_anomaly: number | null;
  power_anomaly: number | null;
  model_risk: number | null;
  is_abnormal: number;
}

export interface HealthTrendPoint {
  eval_time: string;
  health_index: number | null;
  rul_minutes: number | null;
  health_level: string | null;
  risk_score: number | null;
}

export interface HealthTrend {
  device_id: string;
  points: HealthTrendPoint[];
}
