import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import type { PredictionResult } from "../../types/prediction";

function formatFaultType(value: string | null) {
  const map: Record<string, string> = {
    "No Failure": "正常",
    "Heat Failure": "散热故障",
    "Heat Dissipation Failure": "散热故障",
    "Power Failure": "供电故障",
    "Overstrain Failure": "过应力故障",
    "Tool Wear Failure": "刀具磨损故障",
  };

  return value ? map[value] ?? value : "-";
}

function targetWear(record: PredictionResult) {
  const value = record.predicted_params?.["Tool wear [min]"];
  return typeof value === "number" ? value : Number(value ?? NaN);
}

interface PredictionResultTableProps {
  predictions: PredictionResult[];
  onSelect: (prediction: PredictionResult) => void;
}

export default function PredictionResultTable({ predictions, onSelect }: PredictionResultTableProps) {
  const columns: ColumnsType<PredictionResult> = [
    {
      title: "设备ID",
      dataIndex: "device_id",
      key: "device_id",
      width: 120,
    },
    {
      title: "预测时间",
      dataIndex: "predict_time",
      key: "predict_time",
      width: 170,
      render: (value: string) => dayjs(value).format("MM-DD HH:mm:ss"),
    },
    {
      title: "目标磨损",
      key: "target_wear",
      width: 110,
      render: (_, record) => {
        const value = targetWear(record);
        return Number.isFinite(value) ? value.toFixed(2) : "-";
      },
    },
    {
      title: "预测步长",
      dataIndex: "forecast_horizon",
      key: "forecast_horizon",
      width: 110,
      render: (value: number | null) => (value === null ? "-" : `${value} min`),
    },
    {
      title: "目标时间",
      dataIndex: "target_timestamp",
      key: "target_timestamp",
      width: 170,
      render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "预测故障类型",
      dataIndex: "fault_type",
      key: "fault_type",
      width: 150,
      render: (value: string | null) => <Tag color={value === "No Failure" ? "green" : "red"}>{formatFaultType(value)}</Tag>,
    },
    {
      title: "故障概率",
      dataIndex: "probability",
      key: "probability",
      width: 110,
      render: (value: number | null) => (value === null ? "-" : `${(value * 100).toFixed(1)}%`),
    },
    {
      title: "模型版本",
      dataIndex: "model_version",
      key: "model_version",
      width: 150,
      render: (value: string | null) => value || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 96,
      fixed: "right",
      render: (_, record) => (
        <Button type="link" onClick={() => onSelect(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.device_id}-${record.id}-${targetWear(record)}`}
      columns={columns}
      dataSource={predictions}
      pagination={{ pageSize: 8 }}
      scroll={{ x: 1260 }}
    />
  );
}
