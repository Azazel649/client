import { Button, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { SchedulePlanItem } from "../../types/schedule";

interface ScheduleItemTableProps {
  items: SchedulePlanItem[];
  loading?: boolean;
  onAdjust: (item: SchedulePlanItem) => void;
}

export default function ScheduleItemTable({ items, loading, onAdjust }: ScheduleItemTableProps) {
  const columns: ColumnsType<SchedulePlanItem> = [
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 130, fixed: "left" },
    { title: "设备ID", dataIndex: "device_id", key: "device_id", width: 120 },
    {
      title: "原设备",
      dataIndex: "original_device_id",
      key: "original_device_id",
      width: 120,
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
      width: 90,
      render: (value: number) => <Tag color={value > 0 ? "orange" : "green"}>{value} min</Tag>,
    },
    {
      title: "类型",
      dataIndex: "item_type",
      key: "item_type",
      width: 110,
      render: (value: string) => <Tag color={value === "maintenance" ? "purple" : "blue"}>{value === "maintenance" ? "维护" : "生产"}</Tag>,
    },
    {
      title: "调整",
      dataIndex: "is_adjusted",
      key: "is_adjusted",
      width: 90,
      render: (value: number) => <Tag color={value ? "orange" : "default"}>{value ? "已调整" : "未调整"}</Tag>,
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button type="link" onClick={() => onAdjust(record)}>
          调整
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.task_id}-${record.device_id}-${record.start_time}`}
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={{ pageSize: 8, showSizeChanger: true }}
      scroll={{ x: 1100 }}
    />
  );
}
