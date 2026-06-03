import { Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { SchedulePlanItem } from "../../types/schedule";

interface DispatchResultTableProps {
  items: SchedulePlanItem[];
  loading?: boolean;
}

export default function DispatchResultTable({ items, loading }: DispatchResultTableProps) {
  const columns: ColumnsType<SchedulePlanItem> = [
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 140, fixed: "left" },
    { title: "分配设备", dataIndex: "device_id", key: "device_id", width: 130 },
    {
      title: "原设备",
      dataIndex: "original_device_id",
      key: "original_device_id",
      width: 130,
      render: (value: string | null) => value || "-",
    },
    {
      title: "开始时间",
      dataIndex: "start_time",
      key: "start_time",
      width: 170,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "结束时间",
      dataIndex: "end_time",
      key: "end_time",
      width: 170,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "延期",
      dataIndex: "delay_minutes",
      key: "delay_minutes",
      width: 100,
      render: (value: number) => <Tag color={value > 0 ? "orange" : "green"}>{value} min</Tag>,
    },
    {
      title: "调整",
      dataIndex: "is_adjusted",
      key: "is_adjusted",
      width: 100,
      render: (value: number) => <Tag color={value ? "orange" : "default"}>{value ? "已调整" : "自动分配"}</Tag>,
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.task_id}-${record.device_id}-${record.start_time}`}
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: 980 }}
    />
  );
}
