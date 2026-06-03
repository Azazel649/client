import { Button, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { AlertEvent } from "../../types/alert";
import AlertLevelTag from "./AlertLevelTag";

interface AlertTableProps {
  alerts: AlertEvent[];
  loading?: boolean;
  onView: (alert: AlertEvent) => void;
  onHandle: (alertId: string) => void;
}

export default function AlertTable({ alerts, loading, onView, onHandle }: AlertTableProps) {
  const columns: ColumnsType<AlertEvent> = [
    { title: "告警ID", dataIndex: "alert_id", key: "alert_id", width: 150, fixed: "left" },
    { title: "设备ID", dataIndex: "device_id", key: "device_id", width: 120, render: (value) => value || "-" },
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 120, render: (value) => value || "-" },
    { title: "类型", dataIndex: "alert_type", key: "alert_type", width: 120 },
    { title: "等级", dataIndex: "alert_level", key: "alert_level", width: 100, render: (value) => <AlertLevelTag level={value} /> },
    { title: "内容", dataIndex: "message", key: "message", ellipsis: true },
    {
      title: "时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 160,
      render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm") : "-"),
    },
    {
      title: "状态",
      dataIndex: "is_handled",
      key: "is_handled",
      width: 100,
      render: (value: number) => <Tag color={value ? "green" : "orange"}>{value ? "已处理" : "未处理"}</Tag>,
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" onClick={() => onView(record)}>
            详情
          </Button>
          <Button type="link" disabled={Boolean(record.is_handled)} onClick={() => onHandle(record.alert_id)}>
            处理
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table rowKey="alert_id" columns={columns} dataSource={alerts} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
  );
}
