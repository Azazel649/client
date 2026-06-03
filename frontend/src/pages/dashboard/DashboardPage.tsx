import { Alert, Button, Card, Col, Row, Skeleton, Space, Typography } from "antd";
import dayjs from "dayjs";
import { Activity, AlertTriangle, CalendarClock, Factory, HeartPulse, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDashboardOverview } from "../../api/dashboardApi";
import RecentAlertList from "../../components/alert/RecentAlertList";
import HealthDistributionChart from "../../components/charts/HealthDistributionChart";
import MetricCard from "../../components/common/MetricCard";
import DeviceStatusTable from "../../components/device/DeviceStatusTable";
import type { AlertEvent } from "../../types/alert";
import type { DeviceCurrentStatus } from "../../types/device";
import type { MaintenancePlan } from "../../types/maintenance";
import type { ProductionTask } from "../../types/task";

const { Text, Title } = Typography;

interface DashboardData {
  devices: DeviceCurrentStatus[];
  alerts: AlertEvent[];
  tasks: ProductionTask[];
  maintenancePlans: MaintenancePlan[];
}

function isWarningDevice(device: DeviceCurrentStatus) {
  return device.health_index < 70 || device.risk_score >= 50 || device.status === "fault";
}

function isHighRiskDevice(device: DeviceCurrentStatus) {
  return device.health_index < 30 || device.risk_score >= 80 || device.status === "fault";
}

function isPendingTask(task: ProductionTask) {
  return ["pending", "waiting", "created"].includes(task.status);
}

function isTodayPlan(plan: MaintenancePlan) {
  return dayjs(plan.plan_start_time).isSame(dayjs(), "day");
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const overview = await getDashboardOverview();
      setData(overview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "系统总览数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const devices = data?.devices ?? [];
    const tasks = data?.tasks ?? [];
    const maintenancePlans = data?.maintenancePlans ?? [];

    return {
      totalDevices: devices.length,
      runningDevices: devices.filter((device) => device.status === "running").length,
      warningDevices: devices.filter(isWarningDevice).length,
      highRiskDevices: devices.filter(isHighRiskDevice).length,
      pendingTasks: tasks.filter(isPendingTask).length,
      todayMaintenancePlans: maintenancePlans.filter(isTodayPlan).length,
    };
  }, [data]);

  const healthDistribution = useMemo(() => {
    const devices = data?.devices ?? [];
    return [
      { name: "正常", value: devices.filter((device) => device.health_index >= 70).length },
      {
        name: "预警",
        value: devices.filter((device) => device.health_index >= 30 && device.health_index < 70).length,
      },
      { name: "危险", value: devices.filter((device) => device.health_index < 30).length },
    ];
  }, [data]);

  const deviceOverview = useMemo(() => {
    return [...(data?.devices ?? [])].sort((left, right) => {
      const leftRisk = left.risk_score + left.latest_fault_probability * 100 + (100 - left.health_index);
      const rightRisk = right.risk_score + right.latest_fault_probability * 100 + (100 - right.health_index);
      return rightRisk - leftRisk;
    });
  }, [data]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">System Overview</Text>
          <Title level={2}>系统总览</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadDashboard}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Skeleton loading={loading && !data} active paragraph={{ rows: 8 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard title="设备总数" value={metrics.totalDevices} icon={<Factory size={20} />} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard title="运行设备" value={metrics.runningDevices} icon={<Activity size={20} />} tone="success" />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard
              title="预警设备"
              value={metrics.warningDevices}
              icon={<AlertTriangle size={20} />}
              tone="warning"
            />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard
              title="高风险设备"
              value={metrics.highRiskDevices}
              icon={<HeartPulse size={20} />}
              tone="danger"
            />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard title="待处理任务" value={metrics.pendingTasks} icon={<CalendarClock size={20} />} />
          </Col>
          <Col xs={24} sm={12} xl={4}>
            <MetricCard
              title="今日维护计划"
              value={metrics.todayMaintenancePlans}
              icon={<CalendarClock size={20} />}
              tone="warning"
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="dashboard-grid">
          <Col xs={24} xl={9}>
            <Card title="设备健康分布" className="dashboard-card">
              <HealthDistributionChart data={healthDistribution} />
            </Card>
          </Col>
          <Col xs={24} xl={15}>
            <Card
              title="最新未处理告警"
              className="dashboard-card"
              extra={<Text type="secondary">{data?.alerts.length ?? 0} 条</Text>}
            >
              <RecentAlertList alerts={data?.alerts ?? []} />
            </Card>
          </Col>
          <Col span={24}>
            <Card
              title="当前设备状态概览"
              className="dashboard-card"
              extra={
                <Space size={8}>
                  <Text type="secondary">按风险优先展示</Text>
                </Space>
              }
            >
              <DeviceStatusTable devices={deviceOverview} />
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </section>
  );
}
