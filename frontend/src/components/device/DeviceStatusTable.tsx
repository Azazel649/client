import { Button, Table } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { DeviceCurrentStatus } from "../../types/device";
import DeviceStatusTag from "./DeviceStatusTag";
import HealthIndexBar from "./HealthIndexBar";
import RulTag from "./RulTag";

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

interface DeviceStatusTableProps {
  devices: DeviceCurrentStatus[];
  mode?: "compact" | "full";
  onViewDetail?: (deviceId: string) => void;
}

export default function DeviceStatusTable({ devices, mode = "compact", onViewDetail }: DeviceStatusTableProps) {
  const columns: ColumnsType<DeviceCurrentStatus> = [
    {
      title: "设备",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 180,
      render: (_, record) => (
        <div>
          <strong>{record.name}</strong>
          <div className="table-subtext">{record.id}</div>
        </div>
      ),
    },
    {
      title: "车间",
      dataIndex: "workshop",
      key: "workshop",
      width: 110,
      responsive: mode === "full" ? undefined : ["lg"],
      render: (value: string | null) => value || "-",
    },
    {
      title: "类型",
      dataIndex: "device_type",
      key: "device_type",
      width: 110,
      responsive: mode === "full" ? undefined : ["lg"],
      render: (value: string | null) => value || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 96,
      render: (status: string) => <DeviceStatusTag status={status} />,
    },
    {
      title: "HI",
      dataIndex: "health_index",
      key: "health_index",
      width: 170,
      render: (value: number) => <HealthIndexBar value={value} />,
    },
    {
      title: "RUL",
      dataIndex: "rul_hours",
      key: "rul_hours",
      width: 100,
      render: (value: number) => <RulTag value={value} />,
    },
    {
      title: "空气温度",
      dataIndex: "air_temperature",
      key: "air_temperature",
      width: 110,
      responsive: mode === "full" ? undefined : ["xl"],
      render: (value: number) => `${value.toFixed(1)} ℃`,
    },
    {
      title: "工艺温度",
      dataIndex: "process_temperature",
      key: "process_temperature",
      width: 110,
      responsive: mode === "full" ? undefined : ["xl"],
      render: (value: number) => `${value.toFixed(1)} ℃`,
    },
    {
      title: "转速",
      dataIndex: "rotational_speed",
      key: "rotational_speed",
      width: 100,
      responsive: mode === "full" ? undefined : ["xl"],
      render: (value: number) => `${value} rpm`,
    },
    {
      title: "扭矩",
      dataIndex: "torque",
      key: "torque",
      width: 90,
      responsive: mode === "full" ? undefined : ["xl"],
      render: (value: number) => `${value.toFixed(1)} Nm`,
    },
    {
      title: "工具磨损",
      dataIndex: "tool_wear",
      key: "tool_wear",
      width: 100,
      responsive: mode === "full" ? undefined : ["xl"],
      render: (value: number) => `${value} min`,
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

  if (mode === "full" && onViewDetail) {
    columns.push({
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 104,
      render: (_, record) => (
        <Button type="link" onClick={() => onViewDetail(record.id)}>
          查看详情
        </Button>
      ),
    });
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={devices}
      pagination={mode === "full" ? { pageSize: 10, showSizeChanger: true } : false}
      size="middle"
      scroll={{ x: mode === "full" ? 1500 : 900 }}
    />
  );
}
