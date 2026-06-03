import { Alert, Button, Card, Col, Form, InputNumber, Row, Skeleton, Space, Statistic, Typography, message } from "antd";
import { CheckCircle2, RefreshCcw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import { getHiTrend } from "../../api/healthApi";
import { getDeviceTaskQueue } from "../../api/taskApi";
import { checkHiAnomalies, executeTransferPlan, generateTransferPlan } from "../../api/transferApi";
import CandidateDeviceTable from "../../components/transfer/CandidateDeviceTable";
import AbnormalDeviceList from "../../components/transfer/AbnormalDeviceList";
import HiDropChart from "../../components/transfer/HiDropChart";
import TransferConfirmModal from "../../components/transfer/TransferConfirmModal";
import TransferPlanTable from "../../components/transfer/TransferPlanTable";
import UnfinishedTaskTable from "../../components/transfer/UnfinishedTaskTable";
import type { DeviceCurrentStatus } from "../../types/device";
import type { HealthTrendPoint } from "../../types/health";
import type { ProductionTask } from "../../types/task";
import type { HIAnomaly, TransferPlan, TransferPlanRequest } from "../../types/transfer";

const { Text, Title } = Typography;

interface TransferFormValues {
  min_healthy_hi: number;
  population_size: number;
  max_generation: number;
  mutation_rate: number;
}

export default function TransferPage() {
  const [anomalies, setAnomalies] = useState<HIAnomaly[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [devices, setDevices] = useState<DeviceCurrentStatus[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [hiTrend, setHiTrend] = useState<HealthTrendPoint[]>([]);
  const [plan, setPlan] = useState<TransferPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [minHealthyHi, setMinHealthyHi] = useState(70);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<TransferFormValues>();

  async function loadTransferOverview() {
    setLoading(true);
    setError(null);
    try {
      const [monitor, deviceResponse] = await Promise.all([checkHiAnomalies(), getCurrentDeviceStatus()]);
      setAnomalies(monitor.anomalies);
      setDevices(deviceResponse);
      setSelectedDeviceId((current) => current ?? monitor.anomalies[0]?.device_id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "任务转移数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeviceDetail(deviceId: string) {
    setDetailLoading(true);
    try {
      const [queue, trend] = await Promise.all([getDeviceTaskQueue(deviceId), getHiTrend(deviceId, 80)]);
      setTasks(queue.tasks.filter((task) => !["finished", "completed", "cancelled"].includes(task.status)));
      setHiTrend(trend.points);
    } catch (detailError) {
      messageApi.error(detailError instanceof Error ? detailError.message : "异常设备详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadTransferOverview();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      loadDeviceDetail(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const selectedAnomaly = useMemo(
    () => anomalies.find((item) => item.device_id === selectedDeviceId) ?? null,
    [anomalies, selectedDeviceId],
  );

  const candidateDevices = useMemo(() => {
    return devices
      .filter((device) => device.id !== selectedDeviceId)
      .filter((device) => device.health_index >= minHealthyHi)
      .filter((device) => ["running", "idle"].includes(device.status))
      .sort((left, right) => right.health_index - left.health_index);
  }, [devices, minHealthyHi, selectedDeviceId]);

  async function handleGenerate(values: TransferFormValues) {
    if (!selectedDeviceId) {
      messageApi.warning("请选择异常设备");
      return;
    }

    setGenerating(true);
    try {
      const payload: TransferPlanRequest = {
        min_healthy_hi: values.min_healthy_hi,
        population_size: values.population_size,
        max_generation: values.max_generation,
        mutation_rate: values.mutation_rate,
      };
      const response = await generateTransferPlan(selectedDeviceId, payload);
      setPlan(response);
      messageApi.success(response.feasible ? "任务转移方案已生成" : response.message);
      await loadTransferOverview();
    } catch (generateError) {
      messageApi.error(generateError instanceof Error ? generateError.message : "生成任务转移方案失败");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExecute() {
    if (!selectedDeviceId) {
      return;
    }

    setExecuting(true);
    try {
      const response = await executeTransferPlan(selectedDeviceId);
      messageApi.success(`已转移 ${response.transferred_tasks} 个任务`);
      setConfirmOpen(false);
      setPlan(null);
      await loadTransferOverview();
      await loadDeviceDetail(selectedDeviceId);
    } catch (executeError) {
      messageApi.error(executeError instanceof Error ? executeError.message : "执行任务转移失败");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <section className="transfer-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">HI Drop Task Transfer</Text>
          <Title level={2}>HI 骤降任务转移</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadTransferOverview}>
          刷新监测
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card">
            <Statistic title="异常设备" value={anomalies.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card">
            <Statistic title="未完成任务" value={tasks.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card">
            <Statistic title="候选设备" value={candidateDevices.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card">
            <Statistic title="转移任务" value={plan?.items.length ?? 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="dashboard-card" title="异常设备列表">
            <Skeleton loading={loading && anomalies.length === 0} active paragraph={{ rows: 6 }}>
              <AbnormalDeviceList anomalies={anomalies} selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card
            className="dashboard-card"
            title="异常设备详情"
            extra={selectedAnomaly ? `当前 HI ${selectedAnomaly.current_hi.toFixed(1)}` : undefined}
          >
            <HiDropChart points={hiTrend} />
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card" title="生成任务转移方案">
        <Form
          form={form}
          layout="inline"
          initialValues={{ min_healthy_hi: 70, population_size: 30, max_generation: 40, mutation_rate: 0.16 }}
          onValuesChange={(changed) => {
            if (typeof changed.min_healthy_hi === "number") {
              setMinHealthyHi(changed.min_healthy_hi);
            }
          }}
          onFinish={handleGenerate}
        >
          <Form.Item label="最低健康HI" name="min_healthy_hi" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} />
          </Form.Item>
          <Form.Item label="种群规模" name="population_size" rules={[{ required: true }]}>
            <InputNumber min={4} max={200} />
          </Form.Item>
          <Form.Item label="迭代代数" name="max_generation" rules={[{ required: true }]}>
            <InputNumber min={1} max={300} />
          </Form.Item>
          <Form.Item label="变异率" name="mutation_rate" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.01} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<Wand2 size={16} />} loading={generating}>
              生成转移方案
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              icon={<CheckCircle2 size={16} />}
              disabled={!plan?.feasible || plan.items.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              确认执行转移
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="dashboard-card" title="当前未完成任务">
            <UnfinishedTaskTable tasks={tasks} loading={detailLoading} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="dashboard-card" title="候选承接设备">
            <CandidateDeviceTable devices={candidateDevices} loading={loading} />
          </Card>
        </Col>
        <Col span={24}>
          <Card
            className="dashboard-card"
            title="任务转移方案"
            extra={plan ? `总延期 ${plan.metrics.total_delay} min · 高风险负载率 ${plan.metrics.high_risk_load_rate.toFixed(2)}%` : undefined}
          >
            <TransferPlanTable items={plan?.items ?? []} loading={generating} />
          </Card>
        </Col>
      </Row>

      <TransferConfirmModal
        open={confirmOpen}
        plan={plan}
        loading={executing}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleExecute}
      />
    </section>
  );
}
