import { Empty, List, Tag } from "antd";
import dayjs from "dayjs";

import type { AlertEvent } from "../../types/alert";

const levelMap: Record<string, { label: string; color: string }> = {
  critical: { label: "严重", color: "red" },
  high: { label: "高", color: "red" },
  medium: { label: "中", color: "orange" },
  low: { label: "低", color: "blue" },
  warning: { label: "预警", color: "orange" },
};

function getLevelMeta(level: string) {
  return levelMap[level] ?? { label: level || "未知", color: "default" };
}

interface RecentAlertListProps {
  alerts: AlertEvent[];
}

export default function RecentAlertList({ alerts }: RecentAlertListProps) {
  if (alerts.length === 0) {
    return <Empty description="暂无未处理告警" />;
  }

  return (
    <List
      className="recent-alert-list"
      dataSource={alerts.slice(0, 6)}
      renderItem={(alert) => {
        const level = getLevelMeta(alert.alert_level);
        return (
          <List.Item>
            <List.Item.Meta
              title={
                <span className="alert-list-title">
                  <Tag color={level.color}>{level.label}</Tag>
                  <span>{alert.message}</span>
                </span>
              }
              description={
                <span>
                  {alert.device_id ? `设备 ${alert.device_id}` : "系统告警"}
                  {alert.create_time ? ` · ${dayjs(alert.create_time).format("MM-DD HH:mm")}` : ""}
                </span>
              }
            />
          </List.Item>
        );
      }}
    />
  );
}
