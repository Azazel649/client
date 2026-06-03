import { Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { ProductionTask } from "../../types/task";
import TaskStatusTag from "../task/TaskStatusTag";

interface UnfinishedTaskTableProps {
  tasks: ProductionTask[];
  loading?: boolean;
}

export default function UnfinishedTaskTable({ tasks, loading }: UnfinishedTaskTableProps) {
  const columns: ColumnsType<ProductionTask> = [
    { title: "任务ID", dataIndex: "task_id", key: "task_id", width: 130 },
    { title: "任务名称", dataIndex: "task_name", key: "task_name", width: 180, ellipsis: true },
    {
      title: "工时",
      dataIndex: "duration",
      key: "duration",
      width: 90,
      render: (value: number | null) => (value === null ? "-" : `${value} min`),
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      render: (value: number) => <Tag color={value >= 5 ? "red" : "blue"}>{value}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: string) => <TaskStatusTag status={value} />,
    },
    {
      title: "计划结束",
      dataIndex: "end_time",
      key: "end_time",
      width: 140,
      render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm") : "-"),
    },
  ];

  return (
    <Table
      rowKey="task_id"
      columns={columns}
      dataSource={tasks}
      loading={loading}
      size="small"
      pagination={false}
      scroll={{ x: 720 }}
    />
  );
}
