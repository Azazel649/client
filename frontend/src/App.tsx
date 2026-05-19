import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  Factory,
  GitBranch,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Wrench
} from "lucide-react";

import { api } from "./api";
import type {
  DashboardSummary,
  Device,
  DeviceHistoryPoint,
  MaintenancePlan,
  PredictionResult,
  ProductionTask,
  ScheduleItem,
  ScheduleSummary,
  TransferProposal
} from "./types";

type SectionKey = "overview" | "prediction" | "maintenance" | "dispatch";

const sectionTabs: Array<{ key: SectionKey; label: string; hint: string }> = [
  { key: "overview", label: "车间总览", hint: "状态感知" },
  { key: "prediction", label: "故障预测与HI评估", hint: "AMD + TabPFN" },
  { key: "maintenance", label: "维护与生产协同", hint: "维护窗口 / 甘特图" },
  { key: "dispatch", label: "自适应调度", hint: "健康度驱动任务分配" }
];

const deviceStatusText: Record<string, string> = {
  normal: "正常",
  running: "运行中",
  warning: "预警",
  danger: "高风险",
  maintenance: "维护中",
  offline: "离线"
};

const taskStatusText: Record<string, string> = {
  pending: "待排产",
  scheduled: "已排产",
  running: "执行中",
  completed: "已完成",
  transferred: "已转移",
  blocked: "暂停"
};

const planStatusText: Record<string, string> = {
  draft: "草稿",
  generated: "已生成",
  confirmed: "已确认",
  conflict: "存在冲突",
  executed: "已执行"
};

const priorityText: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急"
};

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getRulMinutes(device?: Device) {
  if (!device) return 0;
  if (typeof device.rul_minutes === "number") return device.rul_minutes;
  if (typeof device.rul_hours === "number") return Math.round(device.rul_hours * 60);
  return 0;
}

function healthClass(value: number) {
  if (value < 30) return "danger";
  if (value < 70) return "warning";
  return "good";
}

function healthLabel(value: number) {
  if (value < 30) return "高风险";
  if (value < 70) return "预警";
  return "良好";
}

function percent(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function useInitialLoad() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overview, deviceList, maintenanceList, taskList, schedulePlan] = await Promise.all([
        api.overview(),
        api.devices(),
        api.maintenancePlans(),
        api.productionTasks(),
        api.schedule()
      ]);
      setSummary(overview);
      setDevices(deviceList);
      setPlans(maintenanceList);
      setTasks(taskList);
      setSchedule(schedulePlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  return {
    summary,
    devices,
    plans,
    tasks,
    schedule,
    loading,
    notice,
    error,
    setPlans,
    setTasks,
    setSchedule,
    setNotice,
    setError,
    loadData
  };
}

export default function App() {
  const {
    summary,
    devices,
    plans,
    tasks,
    schedule,
    loading,
    notice,
    error,
    setPlans,
    setTasks,
    setSchedule,
    setNotice,
    setError,
    loadData
  } = useInitialLoad();

  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedPlanDeviceIds, setSelectedPlanDeviceIds] = useState<string[]>([]);
  const [history, setHistory] = useState<DeviceHistoryPoint[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [hiThreshold, setHiThreshold] = useState(70);
  const [transferProposal, setTransferProposal] = useState<TransferProposal | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      const preferred = devices.find((device) => device.health_index < 70) ?? devices[0];
      setSelectedDeviceId(preferred.id);
      setSelectedPlanDeviceIds(devices.filter((device) => device.health_index < 70).map((device) => device.id));
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    async function loadDeviceDetail() {
      try {
        const [nextHistory, nextPredictions] = await Promise.all([
          api.deviceHistory(selectedDeviceId),
          api.predictionResults(selectedDeviceId)
        ]);
        setHistory(nextHistory);
        setPredictions(nextPredictions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "设备详情加载失败");
      }
    }
    void loadDeviceDetail();
  }, [selectedDeviceId, setError]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? devices[0],
    [devices, selectedDeviceId]
  );

  const riskDevices = useMemo(() => devices.filter((device) => device.health_index < 70), [devices]);
  const highRiskDevices = useMemo(() => devices.filter((device) => device.health_index < 30), [devices]);
  const filteredDispatchDevices = useMemo(
    () => devices.filter((device) => device.health_index < hiThreshold),
    [devices, hiThreshold]
  );

  async function handleGeneratePlans() {
    if (selectedPlanDeviceIds.length === 0) {
      setNotice("请先勾选需要生成维护窗口的设备。HI≥70 且 RUL 充足的设备可不生成窗口。");
      return;
    }
    try {
      const nextPlans = await api.generateMaintenancePlans(selectedPlanDeviceIds);
      setPlans(nextPlans);
      setNotice("维护窗口已根据当前 HI、RUL 与故障风险生成。普通设备若无风险可不生成维护窗口。");
      setActiveSection("maintenance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "维护窗口生成失败");
    }
  }

  async function handleOptimizeSchedule() {
    try {
      const nextSchedule = await api.optimizeSchedule();
      setSchedule(nextSchedule);
      setNotice(nextSchedule.message ?? "维护-生产联合优化方案已生成。可在甘特图中查看维护窗口与生产任务冲突。 ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "协同优化求解失败");
    }
  }

  async function handleDispatch() {
    try {
      const result = await api.dispatchTasks();
      setTasks(result.tasks);
      if (result.schedule) setSchedule(result.schedule);
      setNotice(result.message);
      setActiveSection("dispatch");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生产任务调度失败");
    }
  }

  async function handlePreviewTransfer(deviceId: string) {
    try {
      const proposal = await api.transferPreview(deviceId);
      setTransferProposal(proposal);
      setActiveSection("dispatch");
      setNotice("已生成任务动态转移建议，等待管理员确认。 ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务转移建议生成失败");
    }
  }

  async function handleConfirmTransfer() {
    if (!transferProposal) return;
    try {
      const result = await api.confirmTransfer(transferProposal);
      setTasks(result.tasks);
      if (result.schedule) setSchedule(result.schedule);
      setNotice(result.message);
      setTransferProposal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务转移确认失败");
    }
  }

  function togglePlanDevice(deviceId: string) {
    setSelectedPlanDeviceIds((current) =>
      current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Intelligent MES · Fault Prediction Driven</p>
          <h1>基于故障预测的智能化生产执行系统</h1>
          <p className="hero-copy">
            围绕“故障预测—健康评估—维护决策—自适应调度”闭环重构页面，前端接口保留
            <code> VITE_API_BASE_URL </code>配置，并在后端未完成时自动使用本地模拟数据降级预览。
          </p>
        </div>
        <div className="hero-actions">
          <span className={`connection-dot ${error ? "offline" : "online"}`}>
            {error ? "接口异常 / Mock降级" : "接口就绪"}
          </span>
          <button className="icon-button" onClick={loadData} aria-label="刷新数据" title="刷新数据">
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
        </div>
      </section>

      <nav className="module-tabs" aria-label="核心功能模块">
        {sectionTabs.map((tab) => (
          <button
            className={`module-tab ${activeSection === tab.key ? "active" : ""}`}
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
          >
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </nav>

      {error && <div className="alert danger">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {activeSection === "overview" && (
        <OverviewSection
          summary={summary}
          devices={devices}
          highRiskDevices={highRiskDevices}
          riskDevices={riskDevices}
          onJump={setActiveSection}
        />
      )}

      {activeSection === "prediction" && (
        <PredictionSection
          devices={devices}
          selectedDevice={selectedDevice}
          selectedDeviceId={selectedDeviceId}
          history={history}
          predictions={predictions}
          onSelectDevice={setSelectedDeviceId}
          onPreviewTransfer={handlePreviewTransfer}
        />
      )}

      {activeSection === "maintenance" && (
        <MaintenanceSection
          devices={devices}
          plans={plans}
          schedule={schedule}
          selectedPlanDeviceIds={selectedPlanDeviceIds}
          onToggleDevice={togglePlanDevice}
          onGeneratePlans={handleGeneratePlans}
          onOptimizeSchedule={handleOptimizeSchedule}
        />
      )}

      {activeSection === "dispatch" && (
        <DispatchSection
          devices={devices}
          tasks={tasks}
          schedule={schedule}
          hiThreshold={hiThreshold}
          filteredDevices={filteredDispatchDevices}
          transferProposal={transferProposal}
          onChangeThreshold={setHiThreshold}
          onDispatch={handleDispatch}
          onPreviewTransfer={handlePreviewTransfer}
          onConfirmTransfer={handleConfirmTransfer}
          onCloseTransfer={() => setTransferProposal(null)}
        />
      )}
    </main>
  );
}

function OverviewSection({
  summary,
  devices,
  highRiskDevices,
  riskDevices,
  onJump
}: {
  summary: DashboardSummary | null;
  devices: Device[];
  highRiskDevices: Device[];
  riskDevices: Device[];
  onJump: (key: SectionKey) => void;
}) {
  const avgRul = summary?.average_rul_minutes ? `${summary.average_rul_minutes} min` : "--";

  return (
    <>
      <section className="metric-grid" aria-label="运行指标总览">
        <Metric icon={<Factory />} label="设备总数" value={summary?.total_devices ?? (devices.length || "--")} />
        <Metric icon={<Activity />} label="运行设备" value={summary?.running_devices ?? "--"} />
        <Metric icon={<ShieldCheck />} label="平均 HI" value={summary ? summary.average_health_index : "--"} />
        <Metric icon={<TimerReset />} label="平均 RUL" value={avgRul} />
        <Metric icon={<CalendarClock />} label="待维护" value={summary?.pending_maintenance ?? "--"} />
        <Metric icon={<ClipboardList />} label="活跃任务" value={summary?.active_tasks ?? "--"} />
      </section>

      <section className="overview-grid">
        <Panel eyebrow="System Flow" title="状态感知—决策优化—动态执行闭环">
          <div className="flow-row">
            <FlowNode icon={<Database />} title="数据回放 / Redis" text="缓存实时 HI、RUL、温度、转速、扭矩、任务分配" />
            <FlowNode icon={<BarChart3 />} title="AMD + TabPFN" text="预测未来状态向量，并输出故障类型概率" />
            <FlowNode icon={<Wrench />} title="维护窗口" text="以 RUL 为硬约束、HI 为辅助参考生成检修或更换窗口" />
            <FlowNode icon={<GitBranch />} title="自适应调度" text="贪心初始分配 + 遗传算法全局优化 + 任务动态转移" />
          </div>
        </Panel>

        <Panel eyebrow="Risk Snapshot" title="风险设备与处理建议">
          <div className="risk-stack">
            <div className="risk-summary-card danger-soft">
              <strong>{highRiskDevices.length}</strong>
              <span>台高风险设备（HI&lt;30），应停止新任务分配并触发任务转移。</span>
            </div>
            <div className="risk-summary-card warning-soft">
              <strong>{riskDevices.length}</strong>
              <span>台预警设备（HI&lt;70），建议降低负载并生成维护窗口。</span>
            </div>
          </div>
          <div className="quick-actions">
            <button className="text-button" onClick={() => onJump("prediction")}>查看健康评估</button>
            <button className="text-button primary" onClick={() => onJump("maintenance")}>生成维护窗口</button>
          </div>
        </Panel>
      </section>
    </>
  );
}

function PredictionSection({
  devices,
  selectedDevice,
  selectedDeviceId,
  history,
  predictions,
  onSelectDevice,
  onPreviewTransfer
}: {
  devices: Device[];
  selectedDevice?: Device;
  selectedDeviceId: string;
  history: DeviceHistoryPoint[];
  predictions: PredictionResult[];
  onSelectDevice: (deviceId: string) => void;
  onPreviewTransfer: (deviceId: string) => void;
}) {
  const rulMinutes = getRulMinutes(selectedDevice);
  const latestPrediction = predictions[0];

  return (
    <section className="content-grid prediction-grid">
      <Panel eyebrow="Equipment Monitor" title="设备状态监控仪表盘" action={<span className="pill">{devices.length} 台设备</span>}>
        <div className="device-table">
          {devices.map((device) => (
            <button
              key={device.id}
              className={`device-row ${selectedDeviceId === device.id ? "selected" : ""}`}
              onClick={() => onSelectDevice(device.id)}
            >
              <span>
                <strong>{device.name}</strong>
                <small>{device.workshop} · {device.id}</small>
              </span>
              <span className="health-cell compact">
                <b className={healthClass(device.health_index)}>{device.health_index}</b>
                <meter min="0" max="100" value={device.health_index} />
              </span>
              <span className={`status ${healthClass(device.health_index)}`}>{healthLabel(device.health_index)}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Health Detail" title={selectedDevice ? `${selectedDevice.name} 故障预测与健康评估` : "设备详情"}>
        {selectedDevice && (
          <div className="detail-layout">
            <div className="gauge-card">
              <div className={`gauge-ring ${healthClass(selectedDevice.health_index)}`} style={{ "--value": selectedDevice.health_index } as CSSProperties}>
                <strong>{selectedDevice.health_index}</strong>
                <span>HI</span>
              </div>
              <div>
                <h3>{healthLabel(selectedDevice.health_index)}</h3>
                <p>RUL：{rulMinutes} 分钟 · 故障概率：{percent(selectedDevice.fault_probability)}</p>
                <span className={`status ${selectedDevice.status}`}>{deviceStatusText[selectedDevice.status] ?? selectedDevice.status}</span>
              </div>
            </div>

            <div className="parameter-grid">
              <Parameter label="空气温度" value={`${selectedDevice.air_temperature.toFixed(1)} K`} />
              <Parameter label="工艺温度" value={`${selectedDevice.process_temperature.toFixed(1)} K`} />
              <Parameter label="转速" value={`${selectedDevice.rotational_speed} rpm`} />
              <Parameter label="扭矩" value={`${selectedDevice.torque.toFixed(1)} Nm`} />
              <Parameter label="工具磨损" value={`${selectedDevice.tool_wear} min`} />
              <Parameter label="负载占比" value={percent(selectedDevice.load_rate)} />
            </div>

            <div className="split-panel">
              <MiniLineChart title="HI 变化趋势" points={history.map((point) => point.health_index)} suffix="分" />
              <MiniLineChart title="RUL 衰减曲线" points={history.map((point) => point.rul_minutes)} suffix="min" />
            </div>

            <div className="prediction-list">
              <div className="sub-title">
                <h3>未来状态预测</h3>
                <small>{latestPrediction?.model_version ?? "AMD+TabPFN"}</small>
              </div>
              {predictions.map((prediction) => (
                <article className="prediction-card" key={prediction.id}>
                  <div>
                    <strong>{prediction.horizon_minutes} 分钟后</strong>
                    <span>{prediction.fault_type}</span>
                  </div>
                  <div className="probability-bar" title={`故障概率 ${percent(prediction.probability)}`}>
                    <i style={{ width: percent(prediction.probability) }} />
                  </div>
                  <b>{percent(prediction.probability)}</b>
                </article>
              ))}
            </div>

            {selectedDevice.health_index < 30 && (
              <button className="text-button danger-action" onClick={() => onPreviewTransfer(selectedDevice.id)}>
                <ShieldAlert size={16} />
                触发任务转移建议
              </button>
            )}
          </div>
        )}
      </Panel>
    </section>
  );
}

function MaintenanceSection({
  devices,
  plans,
  schedule,
  selectedPlanDeviceIds,
  onToggleDevice,
  onGeneratePlans,
  onOptimizeSchedule
}: {
  devices: Device[];
  plans: MaintenancePlan[];
  schedule: ScheduleSummary | null;
  selectedPlanDeviceIds: string[];
  onToggleDevice: (deviceId: string) => void;
  onGeneratePlans: () => void;
  onOptimizeSchedule: () => void;
}) {
  return (
    <section className="maintenance-layout">
      <Panel
        eyebrow="Maintenance Window"
        title="维护窗口生成"
        action={
          <button className="text-button primary" onClick={onGeneratePlans}>
            <CalendarClock size={16} />
            生成维护窗口
          </button>
        }
      >
        <div className="device-select-list">
          {devices.map((device) => (
            <label key={device.id} className={`select-card ${selectedPlanDeviceIds.includes(device.id) ? "checked" : ""}`}>
              <input
                type="checkbox"
                checked={selectedPlanDeviceIds.includes(device.id)}
                onChange={() => onToggleDevice(device.id)}
              />
              <span>
                <strong>{device.name}</strong>
                <small>HI {device.health_index} · RUL {getRulMinutes(device)} min</small>
              </span>
              <b className={healthClass(device.health_index)}>{healthLabel(device.health_index)}</b>
            </label>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Plan List" title="维护计划管理" action={<span className="pill">{plans.length} 条计划</span>}>
        <div className="list">
          {plans.map((plan) => (
            <article className={`list-item plan-item ${plan.conflict ? "has-conflict" : ""}`} key={plan.id}>
              <div className="item-head">
                <div>
                  <strong>{plan.device_name}</strong>
                  <span>{formatDateTime(plan.window_start)} - {formatDateTime(plan.window_end)}</span>
                </div>
                <span className={`priority ${plan.priority}`}>{priorityText[plan.priority] ?? plan.priority}</span>
              </div>
              <p>{plan.reason}</p>
              <div className="tag-row">
                <span className={`status ${plan.conflict ? "danger" : "running"}`}>
                  {plan.conflict ? "冲突" : planStatusText[plan.status] ?? plan.status}
                </span>
                {plan.maintenance_type && <span className="tag">{plan.maintenance_type}</span>}
                {plan.suggestion && <span className="tag wide-tag">{plan.suggestion}</span>}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        eyebrow="Joint Optimization"
        title="维护—生产联合排程甘特图"
        action={
          <button className="text-button" onClick={onOptimizeSchedule}>
            <ServerCog size={16} />
            求解优化方案
          </button>
        }
      >
        <ScheduleStats schedule={schedule} />
        <GanttChart items={schedule?.items ?? []} />
      </Panel>
    </section>
  );
}

function DispatchSection({
  devices,
  tasks,
  schedule,
  hiThreshold,
  filteredDevices,
  transferProposal,
  onChangeThreshold,
  onDispatch,
  onPreviewTransfer,
  onConfirmTransfer,
  onCloseTransfer
}: {
  devices: Device[];
  tasks: ProductionTask[];
  schedule: ScheduleSummary | null;
  hiThreshold: number;
  filteredDevices: Device[];
  transferProposal: TransferProposal | null;
  onChangeThreshold: (value: number) => void;
  onDispatch: () => void;
  onPreviewTransfer: (deviceId: string) => void;
  onConfirmTransfer: () => void;
  onCloseTransfer: () => void;
}) {
  const tasksByDevice = useMemo(() => {
    const map = new Map<string, ProductionTask[]>();
    tasks.forEach((task) => {
      const key = task.assigned_device_id ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), task]);
    });
    return map;
  }, [tasks]);

  return (
    <section className="dispatch-layout">
      <Panel
        eyebrow="Adaptive Scheduling"
        title="生产调度监控"
        action={
          <button className="text-button primary" onClick={onDispatch}>
            <SlidersHorizontal size={16} />
            执行自适应调度
          </button>
        }
      >
        <div className="filter-bar">
          <label>
            HI 阈值筛选：<strong>{hiThreshold}</strong>
          </label>
          <input
            type="range"
            min="30"
            max="95"
            value={hiThreshold}
            onChange={(event) => onChangeThreshold(Number(event.target.value))}
          />
          <span>{filteredDevices.length} 台设备低于阈值</span>
        </div>
        <div className="dispatch-grid">
          {devices.map((device) => {
            const assignedTasks = tasksByDevice.get(device.id) ?? [];
            const highRisk = device.health_index < 30;
            return (
              <article className={`dispatch-card ${highRisk ? "alarm" : ""}`} key={device.id}>
                <div className="dispatch-head">
                  <div>
                    <strong>{device.name}</strong>
                    <span>{device.workshop}</span>
                  </div>
                  <span className={`status ${healthClass(device.health_index)}`}>{healthLabel(device.health_index)}</span>
                </div>
                <div className="dispatch-health">
                  <div className={`mini-gauge ${healthClass(device.health_index)}`}>{device.health_index}</div>
                  <div>
                    <p>待处理任务：{device.queued_task_count ?? assignedTasks.length}</p>
                    <p>预计完工：{formatDateTime(device.estimated_finish_at)}</p>
                  </div>
                </div>
                <div className="load-line">
                  <span>负载占比 {percent(device.load_rate)}</span>
                  <i><b style={{ width: percent(device.load_rate) }} /></i>
                </div>
                <div className="task-mini-list">
                  {assignedTasks.slice(0, 3).map((task) => (
                    <span key={task.id}>{task.product_name} · {task.estimated_minutes ?? "--"}min</span>
                  ))}
                </div>
                {highRisk && (
                  <button className="text-button danger-action" onClick={() => onPreviewTransfer(device.id)}>
                    <AlertTriangle size={16} />
                    生成任务转移方案
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel eyebrow="Task Queue" title="生产任务列表">
        <div className="list task-list">
          {tasks.map((task) => (
            <article className="list-item" key={task.id}>
              <div className="item-head">
                <div>
                  <strong>{task.product_name}</strong>
                  <span>{task.order_no}</span>
                </div>
                <span className={`status ${task.status}`}>{taskStatusText[task.status] ?? task.status}</span>
              </div>
              <p>
                {task.planned_quantity} 件 · {task.load_level} · {task.estimated_minutes ?? "--"} 分钟 ·
                {task.assigned_device_name ?? " 未分配"}
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Optimization Result" title="调度优化结果">
        <ScheduleStats schedule={schedule} />
        <GanttChart items={schedule?.items.filter((item) => item.type !== "maintenance") ?? []} compact />
      </Panel>

      {transferProposal && (
        <div className="transfer-panel" role="dialog" aria-label="任务动态转移操作面板">
          <div className="transfer-card">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Dynamic Transfer</p>
                <h2>{transferProposal.device_name} 任务转移建议</h2>
              </div>
              <button className="icon-button" onClick={onCloseTransfer}>×</button>
            </div>
            <p className="transfer-reason">{transferProposal.reason}</p>
            <div className="transfer-list">
              {transferProposal.candidates.map((candidate) => (
                <article key={candidate.task_id} className="transfer-item">
                  <div>
                    <strong>{candidate.task_name}</strong>
                    <span>{candidate.from_device_name} → {candidate.to_device_name}</span>
                  </div>
                  <p>{candidate.reason}</p>
                  <small>建议开始：{formatDateTime(candidate.suggested_start_time)} · {candidate.estimated_minutes} 分钟</small>
                </article>
              ))}
            </div>
            <div className="modal-actions">
              <button className="text-button" onClick={onCloseTransfer}>暂不执行</button>
              <button className="text-button primary" onClick={onConfirmTransfer}>确认任务迁移</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Panel({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function FlowNode({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="flow-node">
      <div className="metric-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function Parameter({ label, value }: { label: string; value: string }) {
  return (
    <article className="parameter-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MiniLineChart({ title, points, suffix }: { title: string; points: number[]; suffix: string }) {
  const safePoints = points.length > 0 ? points : [0];
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const range = Math.max(max - min, 1);
  const width = 220;
  const height = 88;
  const polyline = safePoints
    .map((point, index) => {
      const x = safePoints.length === 1 ? width / 2 : (index / (safePoints.length - 1)) * width;
      const y = height - ((point - min) / range) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(" ");
  const last = safePoints[safePoints.length - 1];

  return (
    <article className="mini-chart">
      <div className="item-head">
        <strong>{title}</strong>
        <span>{last} {suffix}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <polyline points={polyline} />
      </svg>
    </article>
  );
}

function ScheduleStats({ schedule }: { schedule: ScheduleSummary | null }) {
  return (
    <div className="schedule-stats">
      <Metric icon={<TimerReset />} label="总延误" value={schedule ? `${schedule.total_delay_minutes}min` : "--"} />
      <Metric icon={<Activity />} label="平均负载" value={schedule ? percent(schedule.average_load_rate) : "--"} />
      <Metric icon={<ShieldAlert />} label="高风险负载" value={schedule ? percent(schedule.high_risk_load_rate) : "--"} />
      <Metric icon={<CheckCircle2 />} label="健康匹配偏差" value={schedule ? schedule.health_match_deviation.toFixed(3) : "--"} />
    </div>
  );
}

function GanttChart({ items, compact = false }: { items: ScheduleItem[]; compact?: boolean }) {
  const devices = Array.from(new Set(items.map((item) => item.device_name)));
  const start = items.length > 0 ? Math.min(...items.map((item) => new Date(item.start_time).getTime())) : Date.now();
  const end = items.length > 0 ? Math.max(...items.map((item) => new Date(item.end_time).getTime())) : start + 60 * 60_000;
  const totalMinutes = Math.max(60, Math.ceil((end - start) / 60_000));

  function itemStyle(item: ScheduleItem) {
    const itemStart = new Date(item.start_time).getTime();
    const itemEnd = new Date(item.end_time).getTime();
    const left = clamp(((itemStart - start) / 60_000 / totalMinutes) * 100);
    const width = Math.max(6, clamp(((itemEnd - itemStart) / 60_000 / totalMinutes) * 100));
    return { left: `${left}%`, width: `${width}%` } as CSSProperties;
  }

  return (
    <div className={`gantt ${compact ? "compact" : ""}`}>
      {devices.length === 0 && <p className="empty-text">暂无排程数据，点击“求解优化方案”或“执行自适应调度”后显示。</p>}
      {devices.map((deviceName) => (
        <div className="gantt-row" key={deviceName}>
          <strong>{deviceName}</strong>
          <div className="gantt-track">
            {items.filter((item) => item.device_name === deviceName).map((item) => (
              <span
                key={item.id}
                className={`gantt-item ${item.type} ${item.conflict ? "conflict" : ""}`}
                style={itemStyle(item)}
                title={`${item.title}: ${formatDateTime(item.start_time)} - ${formatDateTime(item.end_time)}`}
              >
                {item.title}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
