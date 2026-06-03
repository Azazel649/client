import { Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { TransferItem } from "../../types/transfer";

interface TransferPlanTableProps {
  items: TransferItem[];
  loading?: boolean;
}

export default function TransferPlanTable({ items, loading }: TransferPlanTableProps) {
  const columns: ColumnsType<TransferItem> = [
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 130 },
    { title: "原设备", dataIndex: "from_device", key: "from_device", width: 120 },
    { title: "新设备", dataIndex: "to_device", key: "to_device", width: 120 },
    {
      title: "新开始时间",
      dataIndex: "start_time",
      key: "start_time",
      width: 160,
      render: (value: string) => dayjs(value).format("MM-DD HH:mm"),
    },
    {
      title: "新结束时间",
      dataIndex: "end_time",
      key: "end_time",
      width: 160,
      render: (value: string) => dayjs(value).format("MM-DD HH:mm"),
    },
    {
      title: "延期变化",
      dataIndex: "delay_minutes",
      key: "delay_minutes",
      width: 100,
      render: (value: number) => <Tag color={value > 0 ? "orange" : "green"}>{value} min</Tag>,
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.task_id}-${record.to_device}-${record.start_time}`}
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={false}
      scroll={{ x: 800 }}
    />
  );
}
