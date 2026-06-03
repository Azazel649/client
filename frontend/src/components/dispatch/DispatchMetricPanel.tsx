import { Card, Col, Row, Statistic } from "antd";

import type { DispatchDeviceState, DispatchPlanResponse } from "../../types/dispatch";

interface DispatchMetricPanelProps {
  dispatch: DispatchPlanResponse | null;
  devices: DispatchDeviceState[];
}

function valueOrZero(value: number | null | undefined) {
  return value ?? 0;
}

export default function DispatchMetricPanel({ dispatch, devices }: DispatchMetricPanelProps) {
  const plan = dispatch?.plan;
  const healthyTaskCount = devices
    .filter((device) => device.health_index >= 70)
    .reduce((sum, device) => sum + device.task_count, 0);
  const lowHealthTaskCount = devices
    .filter((device) => device.health_index < 70)
    .reduce((sum, device) => sum + device.task_count, 0);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="调度任务数" value={plan?.items.length ?? 0} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="总延期" value={valueOrZero(plan?.total_delay)} suffix="min" />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="负载均衡" value={valueOrZero(plan?.load_balance_score)} precision={2} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="健康匹配" value={valueOrZero(plan?.health_match_score)} precision={2} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="健康设备任务" value={healthyTaskCount} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="低健康设备任务" value={lowHealthTaskCount} />
        </Card>
      </Col>
    </Row>
  );
}
