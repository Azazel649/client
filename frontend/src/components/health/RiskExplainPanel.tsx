import { Descriptions, Progress } from "antd";

import type { HealthEvaluation } from "../../types/health";

interface RiskExplainPanelProps {
  record: HealthEvaluation | null;
}

function percent(value: number | null | undefined) {
  return Number(((value ?? 0) * 100).toFixed(1));
}

export default function RiskExplainPanel({ record }: RiskExplainPanelProps) {
  return (
    <Descriptions bordered column={1} size="small">
      <Descriptions.Item label="温度异常度">
        <Progress percent={percent(record?.temperature_anomaly)} size="small" />
      </Descriptions.Item>
      <Descriptions.Item label="功率异常度">
        <Progress percent={percent(record?.power_anomaly)} size="small" />
      </Descriptions.Item>
      <Descriptions.Item label="模型风险">
        <Progress percent={percent(record?.model_risk)} size="small" status="active" />
      </Descriptions.Item>
      <Descriptions.Item label="综合风险得分">{(record?.risk_score ?? 0).toFixed(2)}</Descriptions.Item>
    </Descriptions>
  );
}
