import { request } from "./request";
import type { AlertEvent, AlertHandleResponse, ScheduleLog } from "../types/alert";

export function getAlerts(params?: { is_handled?: number; alert_type?: string; limit?: number }) {
  return request.get<AlertEvent[], AlertEvent[]>("/alerts", { params });
}

export function getUnhandledAlerts() {
  return request.get<AlertEvent[], AlertEvent[]>("/alerts/unhandled");
}

export function handleAlert(alertId: string) {
  return request.post<AlertHandleResponse, AlertHandleResponse>(`/alerts/${alertId}/handle`);
}

export function getScheduleLogs(params?: { limit?: number; task_id?: string; reason?: string }) {
  return request.get<ScheduleLog[], ScheduleLog[]>("/alerts/schedule-logs", { params });
}
