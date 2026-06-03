import { request } from "./request";
import type { FaultProbability, PredictionResult, PredictionRun, PredictionTriggerRequest } from "../types/prediction";

export function triggerPrediction(deviceId: string, payload: PredictionTriggerRequest = {}) {
  return request.post<PredictionRun, PredictionRun>(`/predictions/${deviceId}/trigger`, payload);
}

export function getLatestPrediction(deviceId: string) {
  return request.get<PredictionResult, PredictionResult>(`/predictions/${deviceId}/latest`);
}

export function getPredictionHistory(deviceId: string, limit = 50) {
  return request.get<PredictionResult[], PredictionResult[]>(`/predictions/${deviceId}/history`, {
    params: { limit },
  });
}

export function getFaultProbabilities(deviceId: string) {
  return request.get<FaultProbability, FaultProbability>(`/predictions/${deviceId}/fault-probabilities`);
}
