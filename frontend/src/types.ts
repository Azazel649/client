export type DeviceStatus = "running" | "warning" | "maintenance" | "offline" | "normal" | "danger";
export type TaskStatus = "pending" | "scheduled" | "running" | "completed" | "transferred" | "blocked";
export type PlanStatus = "draft" | "generated" | "confirmed" | "conflict" | "executed";
export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type FaultType =
  | "No Failure"
  | "Heat Dissipation Failure"
  | "Power Failure"
  | "Overstrain Failure"
  | "Tool Wear Failure"
  | "Random Failures";

export interface DashboardSummary {
  total_devices: number;
  running_devices: number;
  warning_devices: number;
  high_risk_devices?: number;
  average_health_index: number;
  average_rul_minutes?: number;
  pending_maintenance: number;
  active_tasks: number;
  total_delay_minutes?: number;
}

export interface Device {
  id: string;
  name: string;
  workshop: string;
  status: DeviceStatus;
  health_index: number;
  /** 兼容旧接口：若后端暂时只返回 rul_hours，前端会自动换算为分钟。 */
  rul_hours?: number;
  rul_minutes?: number;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  load_rate: number;
  fault_probability?: number;
  predicted_fault_type?: FaultType | string;
  queued_task_count?: number;
  estimated_finish_at?: string;
  updated_at: string;
}

export interface DeviceHistoryPoint {
  timestamp: string;
  health_index: number;
  rul_minutes: number;
  risk_score?: number;
  load_rate?: number;
}

export interface PredictionResult {
  id: string;
  device_id: string;
  predicted_at: string;
  horizon_minutes: number;
  fault_type: FaultType | string;
  probability: number;
  raw_health_index?: number;
  smoothed_health_index?: number;
  temperature_risk?: number;
  power_risk?: number;
  model_version?: string;
}

export interface MaintenancePlan {
  id: string;
  device_id: string;
  device_name: string;
  window_start: string;
  window_end: string;
  maintenance_type?: "inspection" | "replacement" | "repair" | string;
  reason: string;
  priority: PriorityLevel | string;
  status: PlanStatus | string;
  conflict?: boolean;
  suggestion?: string;
}

export interface ProductionTask {
  id: string;
  order_no: string;
  product_name: string;
  planned_quantity: number;
  load_level: string;
  due_date: string;
  estimated_minutes?: number;
  assigned_device_id?: string | null;
  assigned_device_name?: string | null;
  status: TaskStatus;
}

export interface ScheduleItem {
  id: string;
  device_id: string;
  device_name: string;
  task_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "task" | "maintenance" | "transfer";
  status?: string;
  conflict?: boolean;
}

export interface ScheduleSummary {
  message?: string;
  total_delay_minutes: number;
  average_load_rate: number;
  high_risk_load_rate: number;
  health_match_deviation: number;
  items: ScheduleItem[];
}

export interface DispatchResult {
  message: string;
  tasks: ProductionTask[];
  schedule?: ScheduleSummary;
}

export interface TransferCandidate {
  task_id: string;
  task_name: string;
  from_device_id: string;
  from_device_name: string;
  to_device_id: string;
  to_device_name: string;
  suggested_start_time: string;
  estimated_minutes: number;
  reason: string;
}

export interface TransferProposal {
  device_id: string;
  device_name: string;
  triggered_at: string;
  reason: string;
  candidates: TransferCandidate[];
}
