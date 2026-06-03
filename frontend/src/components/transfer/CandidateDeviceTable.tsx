import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { DeviceCurrentStatus } from "../../types/device";
import HealthIndexBar from "../device/HealthIndexBar";

interface CandidateDeviceTableProps {
  devices: DeviceCurrentStatus[];
  loading?: boolean;
}

export default function CandidateDeviceTable({ devices, loading }: CandidateDeviceTableProps) {
  const columns: ColumnsType<DeviceCurrentStatus> = [
    { title: "设备ID", dataIndex: "id", key: "id", width: 120 },
    {
      title: "类型",
      dataIndex: "device_type",
      key: "device_type",
      width: 100,
      render: (value: string | null) => value || "-",
    },
    {
      title: "HI",
      dataIndex: "health_index",
      key: "health_index",
      width: 160,
      render: (value: number) => <HealthIndexBar value={value} />,
    },
    {
      title: "RUL",
      dataIndex: "rul_hours",
      key: "rul_hours",
      width: 110,
      render: (value: number) => `${value.toFixed(1)} h`,
    },
    {
      title: "负载率",
      dataIndex: "load_rate",
      key: "load_rate",
      width: 100,
      render: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: string) => <Tag color={value === "running" || value === "idle" ? "green" : "default"}>{value}</Tag>,
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={devices}
      loading={loading}
      size="small"
      pagination={false}
      scroll={{ x: 700 }}
    />
  );
}
