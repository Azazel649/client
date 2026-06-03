import { request } from "./request";
import type { MonitorCheckResponse, TransferExecuteResponse, TransferPlan, TransferPlanRequest } from "../types/transfer";

export function checkHiAnomalies() {
  return request.post<MonitorCheckResponse, MonitorCheckResponse>("/transfers/monitor/check");
}

export function generateTransferPlan(deviceId: string, payload: TransferPlanRequest) {
  return request.post<TransferPlan, TransferPlan>(`/transfers/${deviceId}/plan`, payload);
}

export function getCachedTransferPlan(deviceId: string) {
  return request.get<TransferPlan, TransferPlan>(`/transfers/${deviceId}/plan`);
}

export function executeTransferPlan(deviceId: string) {
  return request.post<TransferExecuteResponse, TransferExecuteResponse>(`/transfers/${deviceId}/execute`);
}
