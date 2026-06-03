import { Alert, Button, Card, Checkbox, Form, Input, Row, Col, Skeleton, Space, Typography, message } from "antd";
import { CheckCircle2, Play, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import {
  adjustScheduleTask,
  confirmSchedule,
  getCurrentSchedule,
  getScheduleGantt,
  getScheduleMetrics,
  optimizeSchedule,
} from "../../api/scheduleApi";
import ConstraintCheckResult from "../../components/schedule/ConstraintCheckResult";
import ScheduleGanttChart from "../../components/schedule/ScheduleGanttChart";
import ScheduleItemTable from "../../components/schedule/ScheduleItemTable";
import ScheduleMetricPanel from "../../components/schedule/ScheduleMetricPanel";
import TaskAdjustDrawer from "../../components/schedule/TaskAdjustDrawer";
import type { DeviceCurrentStatus } from "../../types/device";
import type { ScheduleAdjustRequest, ScheduleGanttItem, ScheduleMetrics, SchedulePlan, SchedulePlanItem } from "../../types/schedule";

const { Text, Title } = Typography;

interface OptimizeFormValues {
  plan_name?: string;
  save_as_draft?: boolean;
}

export default function SchedulePage() {
  const [plan, setPlan] = useState<SchedulePlan | null>(null);
  const [metrics, setMetrics] = useState<ScheduleMetrics | null>(null);
  const [ganttItems, setGanttItems] = useState<ScheduleGanttItem[]>([]);
  const [devices, setDevices] = useState<DeviceCurrentStatus[]>([]);
  const [adjustingItem, setAdjustingItem] = useState<SchedulePlanItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<OptimizeFormValues>();

  async function loadScheduleData(planId?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const [deviceResponse, planResponse] = await Promise.all([getCurrentDeviceStatus(), getCurrentSchedule()]);
      const targetPlanId = planId ?? planResponse.plan_id;
      const [ganttResponse, metricsResponse] = await Promise.all([
        getScheduleGantt(targetPlanId),
        getScheduleMetrics(targetPlanId),
      ]);
      setDevices(deviceResponse);
      setPlan(planResponse);
      setGanttItems(ganttResponse.items);
      setMetrics(metricsResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "联合排程数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScheduleData();
  }, []);

  const deviceOptions = useMemo(
    () => devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id })),
    [devices],
  );

  const overview = useMemo(
    () => ({
      itemCount: plan?.items.length ?? 0,
      adjustedCount: plan?.items.filter((item) => item.is_adjusted).length ?? 0,
      maintenanceCount: ganttItems.filter((item) => item.item_type === "maintenance").length,
      productionCount: ganttItems.filter((item) => item.item_type !== "maintenance").length,
    }),
    [ganttItems, plan],
  );

  async function handleOptimize(values: OptimizeFormValues) {
    setOptimizing(true);
    setError(null);
    try {
      const optimized = await optimizeSchedule({
        plan_name: values.plan_name || null,
        save_as_draft: values.save_as_draft ?? true,
      });
      messageApi.success("联合排程方案已生成");
      setPlan(optimized);
      await loadScheduleData(optimized.plan_id);
    } catch (optimizeError) {
      messageApi.error(optimizeError instanceof Error ? optimizeError.message : "生成排程失败");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleConfirm() {
    if (!plan) {
      return;
    }

    setConfirming(true);
    try {
      const confirmed = await confirmSchedule(plan.plan_id);
      setPlan(confirmed);
      messageApi.success("排程方案已确认执行");
      await loadScheduleData(confirmed.plan_id);
    } catch (confirmError) {
      messageApi.error(confirmError instanceof Error ? confirmError.message : "确认执行失败");
    } finally {
      setConfirming(false);
    }
  }

  async function handleAdjust(payload: ScheduleAdjustRequest) {
    setAdjusting(true);
    try {
      await adjustScheduleTask(payload);
      messageApi.success("任务调整已保存");
      setAdjustingItem(null);
      await loadScheduleData(payload.plan_id);
    } catch (adjustError) {
      messageApi.error(adjustError instanceof Error ? adjustError.message : "任务调整失败");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <section className="schedule-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Integrated Scheduling</Text>
          <Title level={2}>维护-生产联合排程优化</Title>
        </div>
        <Space wrap>
          <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={() => loadScheduleData(plan?.plan_id)}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<CheckCircle2 size={16} />}
            disabled={!plan || plan.status === "confirmed"}
            loading={confirming}
            onClick={handleConfirm}
          >
            确认执行
          </Button>
        </Space>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Card className="dashboard-card" title="生成联合排程">
        <Form form={form} layout="inline" initialValues={{ save_as_draft: true }} onFinish={handleOptimize}>
          <Form.Item label="方案名称" name="plan_name">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="save_as_draft" valuePropName="checked">
            <Checkbox>保存为草稿</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<Play size={16} />} loading={optimizing}>
              生成联合排程
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <ScheduleMetricPanel plan={plan} metrics={metrics} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="排程明细数">
            <strong>{overview.itemCount}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="人工调整数">
            <strong>{overview.adjustedCount}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="生产任务条目">
            <strong>{overview.productionCount}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="维护窗口条目">
            <strong>{overview.maintenanceCount}</strong>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card" title="联合排程甘特图">
        <Skeleton loading={loading && ganttItems.length === 0} active paragraph={{ rows: 8 }}>
          <ScheduleGanttChart items={ganttItems} />
        </Skeleton>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card className="dashboard-card" title="排程明细">
            <ScheduleItemTable items={plan?.items ?? []} loading={loading} onAdjust={setAdjustingItem} />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card className="dashboard-card" title="约束校验结果">
            <ConstraintCheckResult plan={plan} />
          </Card>
        </Col>
      </Row>

      <TaskAdjustDrawer
        open={Boolean(adjustingItem)}
        planId={plan?.plan_id}
        item={adjustingItem}
        deviceOptions={deviceOptions}
        saving={adjusting}
        onClose={() => setAdjustingItem(null)}
        onSubmit={handleAdjust}
      />
    </section>
  );
}
