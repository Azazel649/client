export interface AlertEvent {
  alert_id: string;
  device_id: string | null;
  task_id: string | null;
  alert_type: string;
  alert_level: string;
  message: string;
  related_data: Record<string, unknown> | null;
  is_handled: number;
  create_time: string | null;
  handled_by: string | null;
  handled_time: string | null;
}
