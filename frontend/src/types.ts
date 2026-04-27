export type DeviceStatus = "running" | "warning" | "maintenance" | "offline";
export type TaskStatus = "pending" | "running" | "completed" | "transferred";

export interface DashboardSummary {
  total_devices: number;
  running_devices: number;
  warning_devices: number;
  average_health_index: number;
  pending_maintenance: number;
  active_tasks: number;
}

export interface Device {
  id: string;
  name: string;
  workshop: string;
  status: DeviceStatus;
  health_index: number;
  rul_hours: number;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  load_rate: number;
  updated_at: string;
}

export interface MaintenancePlan {
  id: string;
  device_id: string;
  device_name: string;
  window_start: string;
  window_end: string;
  reason: string;
  priority: string;
  status: string;
}

export interface ProductionTask {
  id: string;
  order_no: string;
  product_name: string;
  planned_quantity: number;
  load_level: string;
  due_date: string;
  assigned_device_id?: string | null;
  assigned_device_name?: string | null;
  status: TaskStatus;
}

export interface DispatchResult {
  message: string;
  tasks: ProductionTask[];
}

