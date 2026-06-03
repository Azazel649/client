export interface DeviceCurrentStatus {
  id: string;
  name: string;
  device_type: string | null;
  workshop: string | null;
  status: string;
  health_index: number;
  health_level: string;
  rul_hours: number;
  risk_score: number;
  air_temperature: number;
  process_temperature: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  latest_fault_type: string;
  latest_fault_probability: number;
  load_rate: number;
  updated_at: string | null;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: string | null;
  workshop: string | null;
  status: string;
  rated_power: number | null;
  max_load_rate: number | null;
  create_time: string | null;
  update_time: string | null;
}

export interface DeviceDetail {
  device: DeviceInfo;
  current_status: DeviceCurrentStatus | null;
}

export interface OperationLogPoint {
  id: number;
  device_id: string;
  timestamp: string;
  air_temp: number | null;
  process_temp: number | null;
  rotational_speed: number | null;
  torque: number | null;
  tool_wear: number | null;
  source: string;
}

export interface OperationTrend {
  device_id: string;
  points: OperationLogPoint[];
}
