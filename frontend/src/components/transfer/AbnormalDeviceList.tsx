import { Empty, List, Tag } from "antd";
import dayjs from "dayjs";

import type { HIAnomaly } from "../../types/transfer";

interface AbnormalDeviceListProps {
  anomalies: HIAnomaly[];
  selectedDeviceId?: string;
  onSelect: (deviceId: string) => void;
}

function levelColor(level: string) {
  if (["critical", "high"].includes(level)) {
    return "red";
  }
  if (level === "medium") {
    return "orange";
  }
  return "blue";
}

export default function AbnormalDeviceList({ anomalies, selectedDeviceId, onSelect }: AbnormalDeviceListProps) {
  if (anomalies.length === 0) {
    return <Empty description="暂无 HI 骤降设备" />;
  }

  return (
    <List
      dataSource={anomalies}
      renderItem={(item) => (
        <List.Item
          className={selectedDeviceId === item.device_id ? "transfer-list-item-active" : "transfer-list-item"}
          onClick={() => onSelect(item.device_id)}
        >
          <List.Item.Meta
            title={
              <span className="transfer-list-title">
                <strong>{item.device_id}</strong>
                <Tag color={levelColor(item.alert_level)}>{item.alert_level}</Tag>
              </span>
            }
            description={
              <span>
                HI {item.last_hi.toFixed(1)} → {item.current_hi.toFixed(1)}，下降 {item.drop_value.toFixed(1)}
                {item.detected_at ? ` · ${dayjs(item.detected_at).format("MM-DD HH:mm")}` : ""}
              </span>
            }
          />
        </List.Item>
      )}
    />
  );
}
