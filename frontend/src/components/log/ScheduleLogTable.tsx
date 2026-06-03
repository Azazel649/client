import { Table } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { ScheduleLog } from "../../types/alert";

interface ScheduleLogTableProps {
  logs: ScheduleLog[];
  loading?: boolean;
}

export default function ScheduleLogTable({ logs, loading }: ScheduleLogTableProps) {
  const columns: ColumnsType<ScheduleLog> = [
    { title: "ID", dataIndex: "id", key: "id", width: 90 },
    {
      title: "调度时间",
      dataIndex: "schedule_time",
      key: "schedule_time",
      width: 170,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    { title: "方案ID", dataIndex: "plan_id", key: "plan_id", width: 140, render: (value) => value || "-" },
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 130 },
    { title: "原设备", dataIndex: "from_device", key: "from_device", width: 120, render: (value) => value || "-" },
    { title: "新设备", dataIndex: "to_device", key: "to_device", width: 120, render: (value) => value || "-" },
    { title: "原因", dataIndex: "reason", key: "reason", width: 180, render: (value) => value || "-" },
    { title: "操作人", dataIndex: "operator", key: "operator", width: 120, render: (value) => value || "-" },
  ];

  return <Table rowKey="id" columns={columns} dataSource={logs} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 980 }} />;
}
