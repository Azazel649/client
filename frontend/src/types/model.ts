export interface ModelRegisterRequest {
  model_name: string;
  model_type: string;
  version: string;
  file_path: string;
  is_active?: number;
  description?: string | null;
}

export interface ModelRegistry {
  model_id: string;
  model_name: string;
  model_type: string;
  version: string;
  file_path: string;
  is_active: number;
  description: string | null;
  create_time: string | null;
}

export interface ModelMetric {
  id: number;
  model_id: string;
  metric_name: string;
  metric_value: number;
  dataset_name: string | null;
  eval_time: string | null;
}

export interface ModelStatus {
  model_type: string;
  active_model: ModelRegistry | null;
  file_exists: boolean;
  loadable: boolean;
  message: string;
}

export interface ModelReloadResponse {
  message: string;
}
