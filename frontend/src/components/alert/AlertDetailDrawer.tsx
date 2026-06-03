import { Descriptions, Drawer } from "antd";
import dayjs from "dayjs";

import type { AlertEvent } from "../../types/alert";
import AlertLevelTag from "./AlertLevelTag";

interface AlertDetailDrawerProps {
  alert: AlertEvent | null;
  open: boolean;
  onClose: () => void;
}

export default function AlertDetailDrawer({ alert, open, onClose }: AlertDetailDrawerProps) {
  return (
    <Drawer title="告警详情" open={open} width={560} onClose={onClose}>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="告警ID">{alert?.alert_id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="设备ID">{alert?.device_id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="任务ID">{alert?.task_id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="告警类型">{alert?.alert_type ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="告警等级">{alert ? <AlertLevelTag level={alert.alert_level} /> : "-"}</Descriptions.Item>
        <Descriptions.Item label="告警内容">{alert?.message ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="告警时间">
          {alert?.create_time ? dayjs(alert.create_time).format("YYYY-MM-DD HH:mm:ss") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="处理状态">{alert?.is_handled ? "已处理" : "未处理"}</Descriptions.Item>
        <Descriptions.Item label="处理人">{alert?.handled_by ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="处理时间">
          {alert?.handled_time ? dayjs(alert.handled_time).format("YYYY-MM-DD HH:mm:ss") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="关联数据">
          <pre className="json-preview">{JSON.stringify(alert?.related_data ?? {}, null, 2)}</pre>
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}
