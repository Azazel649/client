import type { SchedulePlan } from "./schedule";

export interface DispatchRunRequest {
  plan_name?: string | null;
  save_as_draft: boolean;
  population_size: number;
  max_generation: number;
  mutation_rate: number;
  min_health_index: number;
}

export interface DispatchDeviceState {
  device_id: string;
  device_type: string | null;
  status: string;
  health_index: number;
  rul_minutes: number;
  current_load: number;
  task_count: number;
  load_health_ratio: number;
}

export interface DispatchPlanResponse {
  plan: SchedulePlan;
  device_states: DispatchDeviceState[];
  algorithm: string;
}
