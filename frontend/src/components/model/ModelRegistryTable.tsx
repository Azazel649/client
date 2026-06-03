import { Button, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import type { ModelRegistry } from "../../types/model";

interface ModelRegistryTableProps {
  models: ModelRegistry[];
  loading?: boolean;
  onActivate: (modelId: string) => void;
  onMetrics: (model: ModelRegistry) => void;
}

export default function ModelRegistryTable({ models, loading, onActivate, onMetrics }: ModelRegistryTableProps) {
  const columns: ColumnsType<ModelRegistry> = [
    { title: "模型ID", dataIndex: "model_id", key: "model_id", width: 150 },
    { title: "模型名称", dataIndex: "model_name", key: "model_name", width: 180 },
    { title: "类型", dataIndex: "model_type", key: "model_type", width: 110 },
    { title: "版本", dataIndex: "version", key: "version", width: 110 },
    { title: "路径", dataIndex: "file_path", key: "file_path", ellipsis: true },
    {
      title: "启用",
      dataIndex: "is_active",
      key: "is_active",
      width: 90,
      render: (value: number) => <Tag color={value ? "green" : "default"}>{value ? "启用" : "停用"}</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 160,
      render: (value: string | null) => (value ? dayjs(value).format("MM-DD HH:mm") : "-"),
    },
    {
      title: "操作",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <>
          <Button type="link" disabled={Boolean(record.is_active)} onClick={() => onActivate(record.model_id)}>
            启用
          </Button>
          <Button type="link" onClick={() => onMetrics(record)}>
            指标
          </Button>
        </>
      ),
    },
  ];

  return <Table rowKey="model_id" columns={columns} dataSource={models} loading={loading} pagination={{ pageSize: 8 }} scroll={{ x: 1050 }} />;
}
