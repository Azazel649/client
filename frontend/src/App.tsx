import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Factory,
  RefreshCw,
  ServerCog,
  ShieldCheck
} from "lucide-react";

import { api } from "./api";
import type { DashboardSummary, Device, MaintenancePlan, ProductionTask } from "./types";

const statusText = {
  running: "运行中",
  warning: "预警",
  maintenance: "维护中",
  offline: "离线",
  pending: "待排产",
  completed: "已完成",
  transferred: "已转移"
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function healthClass(value: number) {
  if (value < 30) return "danger";
  if (value < 60) return "warning";
  return "good";
}

export default function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overview, deviceList, maintenanceList, taskList] = await Promise.all([
        api.overview(),
        api.devices(),
        api.maintenancePlans(),
        api.productionTasks()
      ]);
      setSummary(overview);
      setDevices(deviceList);
      setPlans(maintenanceList);
      setTasks(taskList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePlans() {
    const nextPlans = await api.generateMaintenancePlans();
    setPlans(nextPlans);
    setNotice("维护窗口已按当前 HI 与 RUL 生成模拟结果");
  }

  async function handleDispatch() {
    const result = await api.dispatchTasks();
    setTasks(result.tasks);
    setNotice(result.message);
  }

  useEffect(() => {
    loadData();
  }, []);

  const highRiskDevices = useMemo(
    () => devices.filter((device) => device.health_index < 60),
    [devices]
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Intelligent MES Prototype</p>
          <h1>基于故障预测的智能化生产执行系统</h1>
          <p className="hero-copy">
            面向设备健康状态、预测性维护和生产任务调度的前后端分离基础版本。
          </p>
        </div>
        <button className="icon-button" onClick={loadData} aria-label="刷新数据" title="刷新数据">
          <RefreshCw size={18} />
        </button>
      </section>

      {error && <div className="alert danger">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <section className="metric-grid" aria-busy={loading}>
        <Metric icon={<Factory />} label="设备总数" value={summary?.total_devices ?? "--"} />
        <Metric icon={<Activity />} label="运行设备" value={summary?.running_devices ?? "--"} />
        <Metric
          icon={<ShieldCheck />}
          label="平均 HI"
          value={summary ? `${summary.average_health_index}` : "--"}
        />
        <Metric
          icon={<CalendarClock />}
          label="待维护"
          value={summary?.pending_maintenance ?? "--"}
        />
        <Metric icon={<ClipboardList />} label="活跃任务" value={summary?.active_tasks ?? "--"} />
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Equipment</p>
              <h2>设备健康状态</h2>
            </div>
            <span className="pill">{highRiskDevices.length} 台风险设备</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>设备</th>
                  <th>车间</th>
                  <th>状态</th>
                  <th>HI</th>
                  <th>RUL</th>
                  <th>温度</th>
                  <th>负载</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <strong>{device.name}</strong>
                      <span>{device.id}</span>
                    </td>
                    <td>{device.workshop}</td>
                    <td>
                      <span className={`status ${device.status}`}>{statusText[device.status]}</span>
                    </td>
                    <td>
                      <div className="health-cell">
                        <span className={healthClass(device.health_index)}>{device.health_index}</span>
                        <meter min="0" max="100" value={device.health_index} />
                      </div>
                    </td>
                    <td>{device.rul_hours}h</td>
                    <td>{device.process_temperature.toFixed(1)}K</td>
                    <td>{Math.round(device.load_rate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Maintenance</p>
              <h2>维护计划</h2>
            </div>
            <button onClick={handleGeneratePlans} className="text-button">
              <CalendarClock size={16} />
              生成
            </button>
          </div>
          <div className="list">
            {plans.map((plan) => (
              <article className="list-item" key={plan.id}>
                <div>
                  <strong>{plan.device_name}</strong>
                  <span>{formatDateTime(plan.window_start)} - {formatDateTime(plan.window_end)}</span>
                </div>
                <p>{plan.reason}</p>
                <span className={`priority ${plan.priority}`}>{plan.priority}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Scheduling</p>
              <h2>生产任务</h2>
            </div>
            <button onClick={handleDispatch} className="text-button">
              <ServerCog size={16} />
              调度
            </button>
          </div>
          <div className="list">
            {tasks.map((task) => (
              <article className="list-item" key={task.id}>
                <div>
                  <strong>{task.product_name}</strong>
                  <span>{task.order_no}</span>
                </div>
                <p>
                  {task.planned_quantity} 件 · {task.load_level} · {task.assigned_device_name ?? "未分配"}
                </p>
                <span className={`status ${task.status}`}>{statusText[task.status]}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
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

