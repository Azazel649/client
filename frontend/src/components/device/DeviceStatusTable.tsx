import { Progress, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { DeviceCurrentStatus } from "../../types/device";

const statusMap: Record<string, { label: string; color: string }> = {
  running: { label: "运行", color: "green" },
  idle: { label: "空闲", color: "blue" },
  locked: { label: "锁定", color: "default" },
  maintenance: { label: "维护中", color: "processing" },
  offline: { label: "离线", color: "default" },
  fault: { label: "故障", color: "red" },
};

function getHealthStatus(value: number) {
  if (value < 30) {
    return "exception";
  }
  if (value < 70) {
    return "active";
  }
  return "success";
}

function formatFaultType(value: string) {
  const map: Record<string, string> = {
    "No Failure": "正常",
    "Heat Failure": "散热故障",
    "Power Failure": "供电故障",
    "Overstrain Failure": "过应力故障",
    "Tool Wear Failure": "工具磨损故障",
  };

  return map[value] ?? value;
}

const columns: ColumnsType<DeviceCurrentStatus> = [
  {
    title: "设备",
    dataIndex: "name",
    key: "name",
    render: (_, record) => (
      <div>
        <strong>{record.name}</strong>
        <div className="table-subtext">{record.id}</div>
      </div>
    ),
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    width: 96,
    render: (status: string) => {
      const meta = statusMap[status] ?? { label: status, color: "default" };
      return <Tag color={meta.color}>{meta.label}</Tag>;
    },
  },
  {
    title: "HI",
    dataIndex: "health_index",
    key: "health_index",
    width: 170,
    render: (value: number) => (
      <Progress percent={Number(value.toFixed(1))} status={getHealthStatus(value)} size="small" />
    ),
  },
  {
    title: "RUL",
    dataIndex: "rul_hours",
    key: "rul_hours",
    width: 92,
    render: (value: number) => `${value.toFixed(1)} h`,
  },
  {
    title: "故障风险",
    dataIndex: "latest_fault_probability",
    key: "latest_fault_probability",
    width: 150,
    render: (value: number, record) => (
      <div>
        <strong>{(value * 100).toFixed(1)}%</strong>
        <div className="table-subtext">{formatFaultType(record.latest_fault_type)}</div>
      </div>
    ),
  },
  {
    title: "负载率",
    dataIndex: "load_rate",
    key: "load_rate",
    width: 92,
    render: (value: number) => `${value.toFixed(1)}%`,
  },
  {
    title: "更新时间",
    dataIndex: "updated_at",
    key: "updated_at",
    width: 140,
    render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm") : "-"),
  },
];

interface DeviceStatusTableProps {
  devices: DeviceCurrentStatus[];
}

export default function DeviceStatusTable({ devices }: DeviceStatusTableProps) {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={devices}
      pagination={false}
      size="middle"
      scroll={{ x: 820 }}
    />
  );
}
