import { request } from "./request";
import type { HealthEvaluation, HealthTrend } from "../types/health";

export function getLatestHealth(deviceId: string) {
  return request.get<HealthEvaluation, HealthEvaluation>(`/health-records/${deviceId}/latest`);
}

export function getHiTrend(deviceId: string, limit = 100) {
  return request.get<HealthTrend, HealthTrend>(`/health-records/${deviceId}/hi-trend`, {
    params: { limit },
  });
}

export function getRulTrend(deviceId: string, limit = 100) {
  return request.get<HealthTrend, HealthTrend>(`/health-records/${deviceId}/rul-trend`, {
    params: { limit },
  });
}

export function getLowHealthDevices(threshold = 70) {
  return request.get<HealthEvaluation[], HealthEvaluation[]>("/health-records/low-health", {
    params: { threshold },
  });
}

export function evaluateLatestPrediction(deviceId: string) {
  return request.post<HealthEvaluation, HealthEvaluation>(`/health-records/${deviceId}/evaluate`);
}
