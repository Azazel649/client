export interface ScheduleOptimizeRequest {
  plan_name?: string | null;
  save_as_draft: boolean;
}

export interface SchedulePlanItem {
  id: number | null;
  plan_id: string | null;
  task_id: string;
  device_id: string;
  original_device_id: string | null;
  start_time: string;
  end_time: string;
  delay_minutes: number;
  is_adjusted: number;
  item_type: string;
}

export interface SchedulePlan {
  plan_id: string;
  plan_type: string;
  plan_name: string | null;
  total_delay: number;
  makespan: number | null;
  avg_load_rate: number | null;
  load_balance_score: number | null;
  health_match_score: number | null;
  high_risk_load_rate: number | null;
  status: string;
  algorithm: string | null;
  create_time: string | null;
  confirmed_by: string | null;
  confirmed_time: string | null;
  remark: string | null;
  items: SchedulePlanItem[];
}

export interface ScheduleGanttItem {
  id: string;
  plan_id: string | null;
  task_id: string | null;
  task_name: string | null;
  device_id: string;
  start_time: string;
  end_time: string;
  item_type: string;
  delay_minutes: number;
  status: string | null;
}

export interface ScheduleGantt {
  plan_id: string | null;
  items: ScheduleGanttItem[];
}

export interface ScheduleAdjustRequest {
  plan_id: string;
  task_id: string;
  device_id: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleMetrics {
  plan_id: string;
  total_delay: number;
  makespan: number | null;
  avg_load_rate: number | null;
  load_balance_score: number | null;
  high_risk_load_rate: number | null;
}
