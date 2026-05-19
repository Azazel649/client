import type {
  DashboardSummary,
  Device,
  DeviceHistoryPoint,
  DispatchResult,
  MaintenancePlan,
  PredictionResult,
  ProductionTask,
  ScheduleSummary,
  TransferProposal
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const USE_MOCK_ON_ERROR = import.meta.env.VITE_USE_MOCK !== "false";
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 8000);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function request<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      ...init,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (USE_MOCK_ON_ERROR && fallback !== undefined) {
      console.warn(`[frontend mock fallback] ${path}`, error);
      return clone(fallback);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

const baseTime = new Date("2026-05-05T08:00:00+08:00");
const at = (minutes: number) => new Date(baseTime.getTime() + minutes * 60_000).toISOString();

const mockDevices: Device[] = [
  {
    id: "D001",
    name: "CNC-01",
    workshop: "一号车间",
    status: "running",
    health_index: 85,
    rul_minutes: 420,
    air_temperature: 298.6,
    process_temperature: 309.8,
    rotational_speed: 1430,
    torque: 41.2,
    tool_wear: 68,
    load_rate: 0.8,
    fault_probability: 0.08,
    predicted_fault_type: "No Failure",
    queued_task_count: 4,
    estimated_finish_at: at(360),
    updated_at: at(0)
  },
  {
    id: "D002",
    name: "CNC-02",
    workshop: "一号车间",
    status: "warning",
    health_index: 45,
    rul_minutes: 120,
    air_temperature: 299.2,
    process_temperature: 306.1,
    rotational_speed: 1320,
    torque: 54.7,
    tool_wear: 168,
    load_rate: 0.42,
    fault_probability: 0.41,
    predicted_fault_type: "Power Failure",
    queued_task_count: 2,
    estimated_finish_at: at(210),
    updated_at: at(0)
  },
  {
    id: "D003",
    name: "CNC-03",
    workshop: "二号车间",
    status: "warning",
    health_index: 22,
    rul_minutes: 35,
    air_temperature: 300.1,
    process_temperature: 303.4,
    rotational_speed: 1510,
    torque: 62.8,
    tool_wear: 198,
    load_rate: 0.18,
    fault_probability: 0.78,
    predicted_fault_type: "Tool Wear Failure",
    queued_task_count: 2,
    estimated_finish_at: at(90),
    updated_at: at(0)
  },
  {
    id: "D004",
    name: "Lathe-01",
    workshop: "二号车间",
    status: "running",
    health_index: 92,
    rul_minutes: 600,
    air_temperature: 297.8,
    process_temperature: 308.9,
    rotational_speed: 1380,
    torque: 37.5,
    tool_wear: 35,
    load_rate: 0.55,
    fault_probability: 0.04,
    predicted_fault_type: "No Failure",
    queued_task_count: 3,
    estimated_finish_at: at(270),
    updated_at: at(0)
  }
];

const mockSummary: DashboardSummary = {
  total_devices: mockDevices.length,
  running_devices: 2,
  warning_devices: 2,
  high_risk_devices: 1,
  average_health_index: 61,
  average_rul_minutes: 294,
  pending_maintenance: 2,
  active_tasks: 7,
  total_delay_minutes: 32
};

const mockTasks: ProductionTask[] = [
  {
    id: "T01",
    order_no: "MO-20260505-001",
    product_name: "壳体加工",
    planned_quantity: 120,
    load_level: "中负载",
    due_date: at(360),
    estimated_minutes: 95,
    assigned_device_id: "D001",
    assigned_device_name: "CNC-01",
    status: "scheduled"
  },
  {
    id: "T02",
    order_no: "MO-20260505-002",
    product_name: "轴加工",
    planned_quantity: 80,
    load_level: "高负载",
    due_date: at(420),
    estimated_minutes: 120,
    assigned_device_id: "D001",
    assigned_device_name: "CNC-01",
    status: "scheduled"
  },
  {
    id: "T03",
    order_no: "MO-20260505-003",
    product_name: "支架精修",
    planned_quantity: 60,
    load_level: "低负载",
    due_date: at(280),
    estimated_minutes: 55,
    assigned_device_id: "D002",
    assigned_device_name: "CNC-02",
    status: "scheduled"
  },
  {
    id: "T04",
    order_no: "MO-20260505-004",
    product_name: "端盖钻孔",
    planned_quantity: 90,
    load_level: "低负载",
    due_date: at(240),
    estimated_minutes: 40,
    assigned_device_id: "D003",
    assigned_device_name: "CNC-03",
    status: "blocked"
  },
  {
    id: "T05",
    order_no: "MO-20260505-005",
    product_name: "齿轮粗加工",
    planned_quantity: 70,
    load_level: "高负载",
    due_date: at(480),
    estimated_minutes: 140,
    assigned_device_id: "D004",
    assigned_device_name: "Lathe-01",
    status: "running"
  },
  {
    id: "T06",
    order_no: "MO-20260505-006",
    product_name: "法兰检修前加工",
    planned_quantity: 50,
    load_level: "中负载",
    due_date: at(330),
    estimated_minutes: 75,
    assigned_device_id: "D001",
    assigned_device_name: "CNC-01",
    status: "scheduled"
  }
];

const mockPlans: MaintenancePlan[] = [
  {
    id: "P001",
    device_id: "D002",
    device_name: "CNC-02",
    window_start: at(90),
    window_end: at(120),
    maintenance_type: "inspection",
    reason: "HI=45，供电故障概率升高，建议停机检修 30 分钟。",
    priority: "high",
    status: "generated",
    conflict: false,
    suggestion: "可安排在当前工序完成后执行。"
  },
  {
    id: "P002",
    device_id: "D003",
    device_name: "CNC-03",
    window_start: at(25),
    window_end: at(85),
    maintenance_type: "replacement",
    reason: "RUL=35 分钟，工具磨损接近阈值，建议优先更换。",
    priority: "critical",
    status: "conflict",
    conflict: true,
    suggestion: "与 T04 端盖钻孔任务冲突，建议立即转移任务。"
  }
];

const mockSchedule: ScheduleSummary = {
  message: "已根据维护窗口约束生成联合优化方案",
  total_delay_minutes: 32,
  average_load_rate: 0.49,
  high_risk_load_rate: 0.029,
  health_match_deviation: 0.153,
  items: [
    { id: "S01", device_id: "D001", device_name: "CNC-01", task_id: "T01", title: "T01 壳体加工", start_time: at(10), end_time: at(105), type: "task" },
    { id: "S02", device_id: "D001", device_name: "CNC-01", task_id: "T02", title: "T02 轴加工", start_time: at(120), end_time: at(240), type: "task" },
    { id: "S03", device_id: "D002", device_name: "CNC-02", task_id: "T03", title: "T03 支架精修", start_time: at(20), end_time: at(75), type: "task" },
    { id: "S04", device_id: "D002", device_name: "CNC-02", title: "检修窗口", start_time: at(90), end_time: at(120), type: "maintenance" },
    { id: "S05", device_id: "D003", device_name: "CNC-03", title: "更换窗口", start_time: at(25), end_time: at(85), type: "maintenance", conflict: true },
    { id: "S06", device_id: "D004", device_name: "Lathe-01", task_id: "T05", title: "T05 齿轮粗加工", start_time: at(30), end_time: at(170), type: "task" },
    { id: "S07", device_id: "D004", device_name: "Lathe-01", task_id: "T04", title: "T04 端盖钻孔", start_time: at(190), end_time: at(230), type: "transfer" }
  ]
};

function historyFor(deviceId: string): DeviceHistoryPoint[] {
  const device = mockDevices.find((item) => item.id === deviceId) ?? mockDevices[0];
  const values = [device.health_index + 7, device.health_index + 4, device.health_index + 2, device.health_index - 1, device.health_index];
  return values.map((health, index) => ({
    timestamp: at(-240 + index * 60),
    health_index: Math.max(0, Math.min(100, Math.round(health))),
    rul_minutes: Math.max(0, (device.rul_minutes ?? 0) + (4 - index) * 45),
    risk_score: Number((1 - Math.max(0, Math.min(100, health)) / 100).toFixed(2)),
    load_rate: Math.min(1, Math.max(0, device.load_rate - 0.08 + index * 0.04))
  }));
}

function predictionsFor(deviceId: string): PredictionResult[] {
  const device = mockDevices.find((item) => item.id === deviceId) ?? mockDevices[0];
  const baseProbability = device.fault_probability ?? 0.1;
  return [30, 60, 120].map((horizon, index) => ({
    id: `${deviceId}-PR-${horizon}`,
    device_id: deviceId,
    predicted_at: at(index * 10),
    horizon_minutes: horizon,
    fault_type: device.predicted_fault_type ?? "No Failure",
    probability: Number(Math.min(0.95, baseProbability + index * 0.08).toFixed(2)),
    raw_health_index: Math.max(0, device.health_index - index * 5),
    smoothed_health_index: Math.max(0, device.health_index - index * 3),
    temperature_risk: Number(Math.min(1, baseProbability + 0.06).toFixed(2)),
    power_risk: Number(Math.min(1, baseProbability + 0.11).toFixed(2)),
    model_version: "AMD+TabPFN v1.0"
  }));
}

function transferProposalFor(deviceId: string): TransferProposal {
  const device = mockDevices.find((item) => item.id === deviceId) ?? mockDevices[2];
  return {
    device_id: device.id,
    device_name: device.name,
    triggered_at: at(5),
    reason: `${device.name} 当前 HI=${device.health_index}，低于高风险阈值，停止分配新任务并建议迁出待办任务。`,
    candidates: [
      {
        task_id: "T04",
        task_name: "端盖钻孔",
        from_device_id: device.id,
        from_device_name: device.name,
        to_device_id: "D004",
        to_device_name: "Lathe-01",
        suggested_start_time: at(190),
        estimated_minutes: 40,
        reason: "Lathe-01 HI=92，当前负载适中，可承接低负载工序。"
      },
      {
        task_id: "T07",
        task_name: "小批量返修",
        from_device_id: device.id,
        from_device_name: device.name,
        to_device_id: "D001",
        to_device_name: "CNC-01",
        suggested_start_time: at(250),
        estimated_minutes: 35,
        reason: "CNC-01 剩余寿命充足，排队任务完成后仍有可用窗口。"
      }
    ]
  };
}

export const api = {
  overview: () => request<DashboardSummary>("/api/overview", undefined, mockSummary),
  devices: () => request<Device[]>("/api/devices", undefined, mockDevices),
  deviceHistory: (deviceId: string) =>
    request<DeviceHistoryPoint[]>(`/api/devices/${encodeURIComponent(deviceId)}/health/history`, undefined, historyFor(deviceId)),
  predictionResults: (deviceId: string) =>
    request<PredictionResult[]>(`/api/predictions?device_id=${encodeURIComponent(deviceId)}`, undefined, predictionsFor(deviceId)),
  maintenancePlans: () => request<MaintenancePlan[]>("/api/maintenance/plans", undefined, mockPlans),
  generateMaintenancePlans: (deviceIds: string[]) =>
    request<MaintenancePlan[]>(
      "/api/maintenance/plans/generate",
      {
        method: "POST",
        body: JSON.stringify({ device_ids: deviceIds })
      },
      mockPlans.filter((plan) => deviceIds.length === 0 || deviceIds.includes(plan.device_id))
    ),
  optimizeSchedule: () =>
    request<ScheduleSummary>("/api/maintenance/schedule/optimize", { method: "POST" }, mockSchedule),
  schedule: () => request<ScheduleSummary>("/api/scheduling/plan", undefined, mockSchedule),
  productionTasks: () => request<ProductionTask[]>("/api/production/tasks", undefined, mockTasks),
  dispatchTasks: () =>
    request<DispatchResult>(
      "/api/production/tasks/dispatch",
      { method: "POST" },
      { message: "已完成基于 HI/RUL 的自适应任务分配", tasks: mockTasks, schedule: mockSchedule }
    ),
  transferPreview: (deviceId: string) =>
    request<TransferProposal>(
      `/api/scheduling/transfer/preview?device_id=${encodeURIComponent(deviceId)}`,
      undefined,
      transferProposalFor(deviceId)
    ),
  confirmTransfer: (proposal: TransferProposal) =>
    request<DispatchResult>(
      "/api/scheduling/transfer/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          device_id: proposal.device_id,
          task_ids: proposal.candidates.map((candidate) => candidate.task_id),
          candidates: proposal.candidates
        })
      },
      {
        message: "任务转移方案已确认，调度结果已同步更新。",
        tasks: mockTasks.map((task) =>
          proposal.candidates.some((candidate) => candidate.task_id === task.id)
            ? { ...task, status: "transferred", assigned_device_id: "D004", assigned_device_name: "Lathe-01" }
            : task
        ),
        schedule: mockSchedule
      }
    )
};
