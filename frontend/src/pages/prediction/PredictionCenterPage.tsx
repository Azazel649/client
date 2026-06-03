import { Alert, Button, Card, Col, Drawer, Form, InputNumber, Row, Select, Skeleton, Space, Typography, message } from "antd";
import { Play, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import { getLatestPrediction, triggerPrediction } from "../../api/predictionApi";
import FaultProbabilityChart from "../../components/prediction/FaultProbabilityChart";
import PredictedParamsTable from "../../components/prediction/PredictedParamsTable";
import PredictionResultTable from "../../components/prediction/PredictionResultTable";
import type { DeviceCurrentStatus } from "../../types/device";
import type { PredictionResult, PredictionTriggerRequest } from "../../types/prediction";

const { Text, Title } = Typography;

async function safeLatestPrediction(deviceId: string) {
  try {
    return await getLatestPrediction(deviceId);
  } catch {
    return null;
  }
}

export default function PredictionCenterPage() {
  const [devices, setDevices] = useState<DeviceCurrentStatus[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PredictionTriggerRequest>();

  async function loadPredictions() {
    setLoading(true);
    setError(null);
    try {
      const deviceResponse = await getCurrentDeviceStatus();
      setDevices(deviceResponse);
      setSelectedDeviceId((current) => current ?? deviceResponse[0]?.id);

      const latest = await Promise.all(deviceResponse.map((device) => safeLatestPrediction(device.id)));
      setPredictions(latest.filter((item): item is PredictionResult => Boolean(item)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "故障预测数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPredictions();
  }, []);

  const overview = useMemo(() => {
    const abnormalCount = predictions.filter((item) => item.fault_type && item.fault_type !== "No Failure").length;
    const latestTime = predictions
      .map((item) => new Date(item.predict_time).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];

    return {
      latestTime: latestTime ? new Date(latestTime).toLocaleString() : "-",
      modelVersion: predictions.find((item) => item.model_version)?.model_version ?? "-",
      todayCount: predictions.filter((item) => new Date(item.predict_time).toDateString() === new Date().toDateString())
        .length,
      abnormalCount,
    };
  }, [predictions]);

  async function handleTrigger(values: PredictionTriggerRequest) {
    if (!selectedDeviceId) {
      messageApi.warning("请选择设备");
      return;
    }

    setRunning(true);
    try {
      const response = await triggerPrediction(selectedDeviceId, values);
      messageApi.success("预测完成");
      setSelectedPrediction(response.prediction);
      await loadPredictions();
    } catch (runError) {
      messageApi.error(runError instanceof Error ? runError.message : "预测失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="prediction-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Prediction Center</Text>
          <Title level={2}>故障预测中心</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadPredictions}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card className="dashboard-card" title="最近自动预测时间">
            <strong>{overview.latestTime}</strong>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="dashboard-card" title="当前模型版本">
            <strong>{overview.modelVersion}</strong>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="dashboard-card" title="今日预测次数">
            <strong>{overview.todayCount}</strong>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="dashboard-card" title="预测异常设备">
            <strong>{overview.abnormalCount}</strong>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card" title="手动触发预测">
        <Form form={form} layout="inline" onFinish={handleTrigger}>
          <Form.Item label="设备" required>
            <Select
              className="inline-select"
              placeholder="选择设备"
              value={selectedDeviceId}
              options={devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id }))}
              onChange={setSelectedDeviceId}
            />
          </Form.Item>
          <Form.Item label="目标磨损" name="query_wear">
            <InputNumber min={0} precision={0} placeholder="可选" />
          </Form.Item>
          <Form.Item label="设备类型" name="machine_type">
            <Select
              allowClear
              className="short-select"
              options={[
                { label: "L", value: "L" },
                { label: "M", value: "M" },
                { label: "H", value: "H" },
              ]}
              placeholder="可选"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<Play size={16} />} loading={running}>
              触发预测
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="dashboard-card" title="设备预测结果">
        <Skeleton loading={loading && predictions.length === 0} active paragraph={{ rows: 8 }}>
          <PredictionResultTable predictions={predictions} onSelect={setSelectedPrediction} />
        </Skeleton>
      </Card>

      <Drawer
        width={720}
        title="预测详情"
        open={Boolean(selectedPrediction)}
        onClose={() => setSelectedPrediction(null)}
      >
        <Space direction="vertical" size={16} className="full-width">
          <FaultProbabilityChart prediction={selectedPrediction} />
          <Card title="AMD 预测参数" className="dashboard-card">
            <PredictedParamsTable params={selectedPrediction?.predicted_params ?? null} />
          </Card>
        </Space>
      </Drawer>
    </section>
  );
}
