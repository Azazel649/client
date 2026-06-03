import { Tag } from "antd";

const statusMap: Record<string, { label: string; color: string }> = {
  running: { label: "运行", color: "green" },
  idle: { label: "空闲", color: "blue" },
  locked: { label: "锁定", color: "default" },
  maintenance: { label: "维护中", color: "processing" },
  offline: { label: "离线", color: "default" },
  fault: { label: "故障", color: "red" },
};

interface DeviceStatusTagProps {
  status: string;
}

export default function DeviceStatusTag({ status }: DeviceStatusTagProps) {
  const meta = statusMap[status] ?? { label: status || "未知", color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
