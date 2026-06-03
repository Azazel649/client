export interface ProductionTask {
  task_id: string;
  task_name: string;
  product_type: string | null;
  required_device_type: string | null;
  duration: number | null;
  priority: number;
  load_weight: number;
  predecessor_task_id: string | null;
  due_time: string | null;
  assigned_device: string | null;
  start_time: string | null;
  end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: string;
  create_time: string | null;
  update_time: string | null;
}

export interface ProductionTaskCreate {
  task_id: string;
  task_name: string;
  product_type?: string | null;
  required_device_type?: string | null;
  duration: number;
  priority?: number;
  load_weight?: number;
  predecessor_task_id?: string | null;
  due_time?: string | null;
  assigned_device?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string;
}

export interface ProductionTaskUpdate {
  task_name?: string | null;
  product_type?: string | null;
  required_device_type?: string | null;
  duration?: number | null;
  priority?: number | null;
  load_weight?: number | null;
  predecessor_task_id?: string | null;
  due_time?: string | null;
  assigned_device?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
}

export interface TaskQueue {
  device_id: string;
  tasks: ProductionTask[];
}
