import { Card, Tag } from "antd";

import HealthIndexBar from "../device/HealthIndexBar";
import RulTag from "../device/RulTag";
import type { HealthEvaluation } from "../../types/health";

interface HealthMatrixProps {
  records: HealthEvaluation[];
  onSelect: (deviceId: string) => void;
  selectedDeviceId?: string;
}

function levelColor(level: string | null) {
  if (level === "danger" || level === "critical") {
    return "red";
  }
  if (level === "warning" || level === "medium") {
    return "orange";
  }
  return "green";
}

export default function HealthMatrix({ records, onSelect, selectedDeviceId }: HealthMatrixProps) {
  return (
    <div className="health-matrix">
      {records.map((record) => (
        <Card
          key={record.device_id}
          className={`health-device-card ${selectedDeviceId === record.device_id ? "health-device-card-active" : ""}`}
          onClick={() => onSelect(record.device_id)}
        >
          <div className="health-card-title">
            <strong>{record.device_id}</strong>
            <Tag color={levelColor(record.health_level)}>{record.health_level || "normal"}</Tag>
          </div>
          <HealthIndexBar value={record.health_index ?? 0} />
          <div className="health-card-row">
            <span>RUL</span>
            <RulTag value={(record.rul_minutes ?? 0) / 60} />
          </div>
          <div className="health-card-row">
            <span>风险得分</span>
            <strong>{(record.risk_score ?? 0).toFixed(1)}</strong>
          </div>
        </Card>
      ))}
    </div>
  );
}
