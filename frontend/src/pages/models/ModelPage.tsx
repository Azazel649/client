import { Alert, Button, Card, Drawer, Row, Col, Space, Tag, Typography, message } from "antd";
import { RefreshCcw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { activateModel, getModelMetrics, getModelStatus, getModels, registerDefaultModels, reloadModels } from "../../api/modelApi";
import ModelMetricChart from "../../components/model/ModelMetricChart";
import ModelRegistryTable from "../../components/model/ModelRegistryTable";
import type { ModelMetric, ModelRegistry, ModelStatus } from "../../types/model";

const { Text, Title } = Typography;

export default function ModelPage() {
  const [models, setModels] = useState<ModelRegistry[]>([]);
  const [statuses, setStatuses] = useState<ModelStatus[]>([]);
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [metricModel, setMetricModel] = useState<ModelRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadModels() {
    setLoading(true);
    setError(null);
    try {
      const modelResponse = await getModels();
      setModels(modelResponse);
      const modelTypes = Array.from(new Set(modelResponse.map((model) => model.model_type)));
      const statusResponse = await Promise.all(modelTypes.map((type) => getModelStatus(type).catch(() => null)));
      setStatuses(statusResponse.filter((item): item is ModelStatus => Boolean(item)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "模型数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  const activeModels = useMemo(() => models.filter((model) => model.is_active), [models]);

  async function handleActivate(modelId: string) {
    setActionLoading(true);
    try {
      await activateModel(modelId);
      messageApi.success("模型已启用");
      await loadModels();
    } catch (actionError) {
      messageApi.error(actionError instanceof Error ? actionError.message : "启用模型失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDefaults() {
    setActionLoading(true);
    try {
      await registerDefaultModels();
      messageApi.success("默认模型已注册");
      await loadModels();
    } catch (actionError) {
      messageApi.error(actionError instanceof Error ? actionError.message : "注册默认模型失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReload() {
    setActionLoading(true);
    try {
      await reloadModels();
      messageApi.success("模型已重新加载");
    } catch (actionError) {
      messageApi.error(actionError instanceof Error ? actionError.message : "模型重载失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMetrics(model: ModelRegistry) {
    setMetricModel(model);
    setMetrics(await getModelMetrics(model.model_id).catch(() => []));
  }

  return (
    <section className="support-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Model Management</Text>
          <Title level={2}>模型管理</Title>
        </div>
        <Space wrap>
          <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadModels}>
            刷新
          </Button>
          <Button loading={actionLoading} onClick={handleDefaults}>
            注册默认模型
          </Button>
          <Button icon={<RotateCcw size={16} />} loading={actionLoading} onClick={handleReload}>
            重新加载
          </Button>
        </Space>
      </div>
      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}
      <Row gutter={[16, 16]}>
        {activeModels.map((model) => (
          <Col xs={24} md={12} xl={8} key={model.model_id}>
            <Card className="dashboard-card" title={model.model_type} extra={<Tag color="green">启用</Tag>}>
              <strong>{model.model_name}</strong>
              <p className="table-subtext">版本 {model.version}</p>
              <p className="table-subtext">{model.file_path}</p>
            </Card>
          </Col>
        ))}
        {statuses.map((status) => (
          <Col xs={24} md={12} xl={8} key={status.model_type}>
            <Card className="dashboard-card" title={`${status.model_type} 状态`}>
              <Tag color={status.file_exists ? "green" : "red"}>{status.file_exists ? "文件存在" : "文件缺失"}</Tag>
              <Tag color={status.loadable ? "green" : "orange"}>{status.loadable ? "可加载" : "不可加载"}</Tag>
              <p className="table-subtext">{status.message}</p>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="dashboard-card" title="模型版本列表">
        <ModelRegistryTable models={models} loading={loading} onActivate={handleActivate} onMetrics={handleMetrics} />
      </Card>
      <Drawer title={metricModel ? `${metricModel.model_name} 指标` : "模型指标"} open={Boolean(metricModel)} width={640} onClose={() => setMetricModel(null)}>
        <ModelMetricChart metrics={metrics} />
      </Drawer>
    </section>
  );
}
