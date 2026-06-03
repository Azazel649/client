import { request } from "./request";
import type {
  MaintenanceGantt,
  MaintenanceGenerateResponse,
  MaintenancePlan,
  MaintenancePlanUpdateRequest,
  MaintenanceWindowGenerateRequest,
} from "../types/maintenance";

export function getMaintenancePlans(params?: { status?: string; device_id?: string }) {
  return request.get<MaintenancePlan[], MaintenancePlan[]>("/maintenance/plans", { params });
}

export function generateMaintenanceWindows(payload: MaintenanceWindowGenerateRequest) {
  return request.post<MaintenanceGenerateResponse, MaintenanceGenerateResponse>("/maintenance/windows/generate", payload);
}

export function updateMaintenancePlan(planId: string, payload: MaintenancePlanUpdateRequest) {
  return request.patch<MaintenancePlan, MaintenancePlan>(`/maintenance/plans/${planId}`, payload);
}

export function deleteMaintenancePlan(planId: string) {
  return request.delete<void, void>(`/maintenance/plans/${planId}`);
}

export function getMaintenanceGantt() {
  return request.get<MaintenanceGantt, MaintenanceGantt>("/maintenance/gantt");
}
