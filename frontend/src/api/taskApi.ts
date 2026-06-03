import { request } from "./request";
import type { ProductionTask, ProductionTaskCreate, ProductionTaskUpdate, TaskQueue } from "../types/task";

export function getTasks(params?: { status?: string }) {
  return request.get<ProductionTask[], ProductionTask[]>("/tasks", { params });
}

export function createTask(payload: ProductionTaskCreate) {
  return request.post<ProductionTask, ProductionTask>("/tasks", payload);
}

export function getPendingTasks() {
  return request.get<ProductionTask[], ProductionTask[]>("/tasks/pending");
}

export function getDeviceTaskQueue(deviceId: string) {
  return request.get<TaskQueue, TaskQueue>(`/tasks/device/${deviceId}`);
}

export function updateTask(taskId: string, payload: ProductionTaskUpdate) {
  return request.patch<ProductionTask, ProductionTask>(`/tasks/${taskId}`, payload);
}

export function deleteTask(taskId: string) {
  return request.delete<void, void>(`/tasks/${taskId}`);
}
