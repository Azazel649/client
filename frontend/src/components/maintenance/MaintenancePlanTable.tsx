import { Button, Popconfirm, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { MaintenancePlan } from "../../types/maintenance";

const maintenanceTypeMap: Record<string, { label: string; color: string }> = {
  repair: { label: "检修", color: "blue" },
  replace: { label: "更换", color: "purple" },
};

const riskMap: Record<string, { label: string; color: string }> = {
  low: { label: "低", color: "green" },
  medium: { label: "中", color: "orange" },
  high: { label: "高", color: "red" },
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "orange" },
  confirmed: { label: "已确认", color: "blue" },
  executing: { label: "执行中", color: "processing" },
  finished: { label: "已完成", color: "green" },
  cancelled: { label: "已取消", color: "default" },
};

interface MaintenancePlanTableProps {
  plans: MaintenancePlan[];
  loading?: boolean;
  onEdit: (plan: MaintenancePlan) => void;
  onDelete: (planId: string) => void;
}

function tagFromMap(value: string | null, map: Record<string, { label: string; color: string }>) {
  if (!value) {
    return "-";
  }

  const meta = map[value] ?? { label: value, color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

export default function MaintenancePlanTable({ plans, loading, onEdit, onDelete }: MaintenancePlanTableProps) {
  const columns: ColumnsType<MaintenancePlan> = [
    {
      title: "计划ID",
      dataIndex: "plan_id",
      key: "plan_id",
      width: 140,
      fixed: "left",
    },
    {
      title: "设备ID",
      dataIndex: "device_id",
      key: "device_id",
      width: 120,
    },
    {
      title: "维护类型",
      dataIndex: "maintenance_type",
      key: "maintenance_type",
      width: 110,
      render: (value: string | null) => tagFromMap(value, maintenanceTypeMap),
    },
    {
      title: "开始时间",
      dataIndex: "plan_start_time",
      key: "plan_start_time",
      width: 170,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "结束时间",
      dataIndex: "plan_end_time",
      key: "plan_end_time",
      width: 170,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "时长",
      dataIndex: "duration_minutes",
      key: "duration_minutes",
      width: 90,
      render: (value: number | null) => (value === null ? "-" : `${value} min`),
    },
    {
      title: "风险",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 90,
      render: (value: string | null) => tagFromMap(value, riskMap),
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 110,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value: string) => tagFromMap(value, statusMap),
    },
    {
      title: "原因",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (value: string | null) => value || "-",
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
          <Popconfirm title="确认删除该维护计划？" onConfirm={() => onDelete(record.plan_id)}>
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
      rowKey="plan_id"
      loading={loading}
      columns={columns}
      dataSource={plans}
      pagination={{ pageSize: 8, showSizeChanger: true }}
      scroll={{ x: 1380 }}
    />
  );
}
