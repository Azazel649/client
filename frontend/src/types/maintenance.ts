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
