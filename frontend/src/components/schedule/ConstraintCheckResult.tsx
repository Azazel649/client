import { Alert, List, Tag } from "antd";

import type { SchedulePlan } from "../../types/schedule";

interface ConstraintCheckResultProps {
  plan: SchedulePlan | null;
}

export default function ConstraintCheckResult({ plan }: ConstraintCheckResultProps) {
  if (!plan) {
    return <Alert type="info" showIcon message="暂无排程方案" />;
  }

  const checks = [
    {
      label: "任务均已分配设备",
      passed: plan.items.every((item) => Boolean(item.device_id)),
    },
    {
      label: "任务时间窗口有效",
      passed: plan.items.every((item) => new Date(item.end_time).getTime() > new Date(item.start_time).getTime()),
    },
    {
      label: "高风险设备负载受控",
      passed: (plan.high_risk_load_rate ?? 0) <= 30,
    },
    {
      label: "排程方案可确认",
      passed: !["confirmed", "cancelled"].includes(plan.status),
    },
  ];

  return (
    <List
      dataSource={checks}
      renderItem={(item) => (
        <List.Item>
          <span>{item.label}</span>
          <Tag color={item.passed ? "green" : "red"}>{item.passed ? "通过" : "需检查"}</Tag>
        </List.Item>
      )}
    />
  );
}
