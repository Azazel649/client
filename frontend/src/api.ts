import type {
  DashboardSummary,
  Device,
  DispatchResult,
  MaintenancePlan,
  ProductionTask
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  overview: () => request<DashboardSummary>("/api/overview"),
  devices: () => request<Device[]>("/api/devices"),
  maintenancePlans: () => request<MaintenancePlan[]>("/api/maintenance/plans"),
  generateMaintenancePlans: () =>
    request<MaintenancePlan[]>("/api/maintenance/plans/generate", { method: "POST" }),
  productionTasks: () => request<ProductionTask[]>("/api/production/tasks"),
  dispatchTasks: () => request<DispatchResult>("/api/production/tasks/dispatch", { method: "POST" })
};

