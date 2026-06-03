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
