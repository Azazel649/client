import { Button, Popconfirm, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { ProductionTask } from "../../types/task";
import TaskStatusTag from "./TaskStatusTag";

interface TaskTableProps {
  tasks: ProductionTask[];
  loading?: boolean;
  onEdit: (task: ProductionTask) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (task: ProductionTask, status: string) => void;
  onViewQueue: (deviceId: string) => void;
}

const statusOptions = [
  { label: "待排程", value: "pending" },
  { label: "已排程", value: "scheduled" },
  { label: "执行中", value: "running" },
  { label: "已暂停", value: "paused" },
  { label: "已完成", value: "finished" },
  { label: "已取消", value: "cancelled" },
];

export default function TaskTable({ tasks, loading, onEdit, onDelete, onStatusChange, onViewQueue }: TaskTableProps) {
  const columns: ColumnsType<ProductionTask> = [
    {
      title: "任务",
      dataIndex: "task_name",
      key: "task_name",
      width: 210,
      fixed: "left",
      render: (_, record) => (
        <div>
          <strong>{record.task_name}</strong>
          <div className="table-subtext">{record.task_id}</div>
        </div>
      ),
    },
    {
      title: "产品类型",
      dataIndex: "product_type",
      key: "product_type",
      width: 120,
      render: (value: string | null) => value || "-",
    },
    {
      title: "设备类型",
      dataIndex: "required_device_type",
      key: "required_device_type",
      width: 120,
      render: (value: string | null) => value || "-",
    },
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
      render: (value: number) => <Tag color={value >= 5 ? "red" : value >= 3 ? "orange" : "blue"}>{value}</Tag>,
    },
    {
      title: "负载权重",
      dataIndex: "load_weight",
      key: "load_weight",
      width: 100,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: "交期",
      dataIndex: "due_time",
      key: "due_time",
      width: 160,
      render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm") : "-"),
    },
    {
      title: "分配设备",
      dataIndex: "assigned_device",
      key: "assigned_device",
      width: 130,
      render: (value: string | null) =>
        value ? (
          <Button type="link" onClick={() => onViewQueue(value)}>
            {value}
          </Button>
        ) : (
          "-"
        ),
    },
    {
      title: "计划时间",
      key: "plan_time",
      width: 210,
      render: (_, record) =>
        record.start_time && record.end_time
          ? `${dayjs(record.start_time).format("MM-DD HH:mm")} - ${dayjs(record.end_time).format("MM-DD HH:mm")}`
          : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: string, record) => (
        <Select
          size="small"
          value={value}
          options={statusOptions}
          className="task-status-select"
          optionRender={(option) => <TaskStatusTag status={String(option.value)} />}
          onChange={(nextStatus) => onStatusChange(record, nextStatus)}
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 136,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该任务？" onConfirm={() => onDelete(record.task_id)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="task_id"
      loading={loading}
      columns={columns}
      dataSource={tasks}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: 1520 }}
    />
  );
}
