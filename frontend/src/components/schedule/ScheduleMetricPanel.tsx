import { Card, Col, Row, Statistic } from "antd";

import type { ScheduleMetrics, SchedulePlan } from "../../types/schedule";

interface ScheduleMetricPanelProps {
  plan: SchedulePlan | null;
  metrics: ScheduleMetrics | null;
}

function valueOrZero(value: number | null | undefined) {
  return value ?? 0;
}

export default function ScheduleMetricPanel({ plan, metrics }: ScheduleMetricPanelProps) {
  const source = metrics ?? plan;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={5}>
        <Card className="dashboard-card">
          <Statistic title="总延期" value={valueOrZero(source?.total_delay)} suffix="min" />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={5}>
        <Card className="dashboard-card">
          <Statistic title="总完工时间" value={valueOrZero(source?.makespan)} suffix="min" />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={5}>
        <Card className="dashboard-card">
          <Statistic title="平均负载率" value={valueOrZero(source?.avg_load_rate)} precision={2} suffix="%" />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={5}>
        <Card className="dashboard-card">
          <Statistic title="负载均衡" value={valueOrZero(source?.load_balance_score)} precision={2} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={4}>
        <Card className="dashboard-card">
          <Statistic title="高风险负载率" value={valueOrZero(source?.high_risk_load_rate)} precision={2} suffix="%" />
        </Card>
      </Col>
    </Row>
  );
}
