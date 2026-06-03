export interface MaintenancePlan {
  plan_id: string;
  device_id: string;
  plan_start_time: string;
  plan_end_time: string;
  maintenance_type: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  risk_level: string | null;
  source: string;
  reason: string | null;
  status: string;
  create_time: string | null;
  update_time: string | null;
}

export interface MaintenanceWindowGenerateRequest {
  device_ids: string[];
}

export interface MaintenancePlanUpdateRequest {
  plan_start_time?: string | null;
  plan_end_time?: string | null;
  maintenance_type?: "repair" | "replace" | null;
  risk_level?: "low" | "medium" | "high" | null;
  reason?: string | null;
  status?: "pending" | "confirmed" | "executing" | "finished" | "cancelled" | null;
}

export interface MaintenanceGenerateItem {
  device_id: string;
  generated: boolean;
  message: string;
  plan: MaintenancePlan | null;
  conflict_task_ids: string[];
}

export interface MaintenanceGenerateResponse {
  items: MaintenanceGenerateItem[];
}

export interface MaintenanceGanttItem {
  id: string;
  device_id: string;
  title: string;
  start_time: string;
  end_time: string;
  item_type: string;
  status: string;
  conflict_task_ids: string[];
}

export interface MaintenanceGantt {
  items: MaintenanceGanttItem[];
}
