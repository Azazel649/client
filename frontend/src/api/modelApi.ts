import { request } from "./request";
import type { ModelMetric, ModelRegisterRequest, ModelRegistry, ModelReloadResponse, ModelStatus } from "../types/model";

export function getModels(params?: { model_type?: string }) {
  return request.get<ModelRegistry[], ModelRegistry[]>("/models", { params });
}

export function registerModel(payload: ModelRegisterRequest) {
  return request.post<ModelRegistry, ModelRegistry>("/models", payload);
}

export function registerDefaultModels() {
  return request.post<ModelRegistry[], ModelRegistry[]>("/models/register-defaults");
}

export function getActiveModel(modelType: string) {
  return request.get<ModelRegistry | null, ModelRegistry | null>(`/models/active/${modelType}`);
}

export function getModelStatus(modelType: string) {
  return request.get<ModelStatus, ModelStatus>(`/models/status/${modelType}`);
}

export function activateModel(modelId: string) {
  return request.post<ModelRegistry, ModelRegistry>(`/models/${modelId}/activate`);
}

export function getModelMetrics(modelId: string) {
  return request.get<ModelMetric[], ModelMetric[]>(`/models/${modelId}/metrics`);
}

export function reloadModels() {
  return request.post<ModelReloadResponse, ModelReloadResponse>("/models/reload");
}
