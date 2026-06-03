import { Card, Statistic } from "antd";
import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
  suffix?: string;
}

export default function MetricCard({ title, value, icon, tone = "primary", suffix }: MetricCardProps) {
  return (
    <Card className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-inner">
        <span className="metric-card-icon">{icon}</span>
        <Statistic title={title} value={value} suffix={suffix} />
      </div>
    </Card>
  );
}
