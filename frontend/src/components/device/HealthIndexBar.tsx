import { Progress } from "antd";

interface HealthIndexBarProps {
  value: number;
}

function getHealthStatus(value: number) {
  if (value < 30) {
    return "exception";
  }
  if (value < 70) {
    return "active";
  }
  return "success";
}

export default function HealthIndexBar({ value }: HealthIndexBarProps) {
  return <Progress percent={Number(value.toFixed(1))} status={getHealthStatus(value)} size="small" />;
}
