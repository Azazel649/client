import { Alert, Button, Card, Col, Row, Skeleton, Space, Typography, message } from "antd";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDispatch, getDispatchDeviceStates, runAdaptiveDispatch } from "../../api/dispatchApi";
import AlgorithmStepCard from "../../components/dispatch/AlgorithmStepCard";
import DeviceLoadHealthMatrix from "../../components/dispatch/DeviceLoadHealthMatrix";
import DispatchControlPanel from "../../components/dispatch/DispatchControlPanel";
import DispatchMetricPanel from "../../components/dispatch/DispatchMetricPanel";
import DispatchResultTable from "../../components/dispatch/DispatchResultTable";
import type { DispatchDeviceState, DispatchPlanResponse, DispatchRunRequest } from "../../types/dispatch";

const { Text, Title } = Typography;

export default function DispatchPage() {
  const [dispatch, setDispatch] = useState<DispatchPlanResponse | null>(null);
  const [deviceStates, setDeviceStates] = useState<DispatchDeviceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadDispatchData() {
    setLoading(true);
    setError(null);
    try {
      const [currentDispatch, devices] = await Promise.all([getCurrentDispatch(), getDispatchDeviceStates()]);
      setDispatch(currentDispatch);
      setDeviceStates(currentDispatch.device_states.length > 0 ? currentDispatch.device_states : devices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "自适应调度数据加载失败");
      try {
        setDeviceStates(await getDispatchDeviceStates());
      } catch {
        setDeviceStates([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDispatchData();
  }, []);

  const riskOverview = useMemo(
    () => ({
      healthyDevices: deviceStates.filter((device) => device.health_index >= 70).length,
      lowHealthDevices: deviceStates.filter((device) => device.health_index < 70).length,
      highLoadDevices: deviceStates.filter((device) => device.current_load >= 80).length,
      lockedDevices: deviceStates.filter((device) => ["locked", "fault", "maintenance"].includes(device.status)).length,
    }),
    [deviceStates],
  );

  async function handleRun(payload: DispatchRunRequest) {
    setRunning(true);
    setError(null);
    try {
      const response = await runAdaptiveDispatch(payload);
      setDispatch(response);
      setDeviceStates(response.device_states);
      messageApi.success("自适应调度方案已生成");
    } catch (runError) {
      messageApi.error(runError instanceof Error ? runError.message : "自适应调度运行失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="dispatch-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Adaptive Dispatch</Text>
          <Title level={2}>自适应生产调度</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadDispatchData}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="warning" showIcon /> : null}

      <Card className="dashboard-card" title="任务智能分配控制">
        <DispatchControlPanel loading={running} onRun={handleRun} />
      </Card>

      <Card className="dashboard-card" title="贪心 + 遗传算法步骤">
        <AlgorithmStepCard active={dispatch ? 4 : 0} />
      </Card>

      <DispatchMetricPanel dispatch={dispatch} devices={deviceStates} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="健康设备">
            <strong>{riskOverview.healthyDevices}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="低健康设备">
            <strong>{riskOverview.lowHealthDevices}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="高负载设备">
            <strong>{riskOverview.highLoadDevices}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="受限设备">
            <strong>{riskOverview.lockedDevices}</strong>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card" title="设备负载-健康矩阵">
        <Skeleton loading={loading && deviceStates.length === 0} active paragraph={{ rows: 8 }}>
          <DeviceLoadHealthMatrix devices={deviceStates} />
        </Skeleton>
      </Card>

      <Card
        className="dashboard-card"
        title="调度结果表"
        extra={
          <Space size={8}>
            <Text type="secondary">{dispatch?.algorithm ?? "greedy_ga_health_dispatch"}</Text>
          </Space>
        }
      >
        <DispatchResultTable items={dispatch?.plan.items ?? []} loading={loading} />
      </Card>
    </section>
  );
}
