import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

interface PredictedParamsTableProps {
  params: Record<string, unknown> | null;
}

interface ParamRow {
  key: string;
  value: string;
}

export default function PredictedParamsTable({ params }: PredictedParamsTableProps) {
  if (!params || Object.keys(params).length === 0) {
    return <Empty description="暂无 AMD 预测参数" />;
  }

  const rows = Object.entries(params).map(([key, value]) => ({
    key,
    value: typeof value === "number" ? value.toFixed(4) : String(value),
  }));

  const columns: ColumnsType<ParamRow> = [
    { title: "参数", dataIndex: "key", key: "key" },
    { title: "预测值", dataIndex: "value", key: "value" },
  ];

  return <Table rowKey="key" columns={columns} dataSource={rows} pagination={false} size="small" />;
}
