export interface HIAnomaly {
  device_id: string;
  current_hi: number;
  last_hi: number;
  drop_value: number;
  alert_level: string;
  reason: string;
  detected_at: string;
  alert_id: string | null;
}

export interface MonitorCheckResponse {
  checked_at: string;
  anomalies: HIAnomaly[];
}

export interface TransferPlanRequest {
  min_healthy_hi: number;
  population_size: number;
  max_generation: number;
  mutation_rate: number;
}

export interface TransferItem {
  task_id: string;
  from_device: string;
  to_device: string;
  start_time: string;
  end_time: string;
  delay_minutes: number;
}

export interface TransferMetrics {
  total_delay: number;
  makespan: number;
  load_balance_score: number;
  high_risk_load_rate: number;
}

export interface TransferPlan {
  feasible: boolean;
  anomaly_device_id: string;
  items: TransferItem[];
  metrics: TransferMetrics;
  message: string;
}

export interface TransferExecuteResponse {
  device_id: string;
  transferred_tasks: number;
  executed_at: string;
  message: string;
}
