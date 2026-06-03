import { Tag } from "antd";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待排程", color: "orange" },
  scheduled: { label: "已排程", color: "blue" },
  running: { label: "执行中", color: "processing" },
  paused: { label: "已暂停", color: "default" },
  finished: { label: "已完成", color: "green" },
  completed: { label: "已完成", color: "green" },
  cancelled: { label: "已取消", color: "default" },
};

interface TaskStatusTagProps {
  status: string;
}

export default function TaskStatusTag({ status }: TaskStatusTagProps) {
  const meta = statusMap[status] ?? { label: status || "未知", color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
