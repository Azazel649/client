import { Alert, Button, Card, DatePicker, Form, Modal, Row, Col, Select, Skeleton, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import {
  deleteMaintenancePlan,
  generateMaintenanceWindows,
  getMaintenanceGantt,
  getMaintenancePlans,
  updateMaintenancePlan,
} from "../../api/maintenanceApi";
import MaintenanceConflictTag from "../../components/maintenance/MaintenanceConflictTag";
import MaintenanceGanttChart from "../../components/maintenance/MaintenanceGanttChart";
import MaintenancePlanTable from "../../components/maintenance/MaintenancePlanTable";
import MaintenanceWindowForm from "../../components/maintenance/MaintenanceWindowForm";
import type {
  MaintenanceGanttItem,
  MaintenanceGenerateItem,
  MaintenancePlan,
  MaintenancePlanUpdateRequest,
} from "../../types/maintenance";

const { Text, Title } = Typography;

interface MaintenanceFormValues {
  plan_time?: [dayjs.Dayjs, dayjs.Dayjs];
  maintenance_type?: "repair" | "replace";
  risk_level?: "low" | "medium" | "high";
  status?: "pending" | "confirmed" | "executing" | "finished" | "cancelled";
  reason?: string;
}

function toUpdatePayload(values: MaintenanceFormValues): MaintenancePlanUpdateRequest {
  return {
    plan_start_time: values.plan_time?.[0]?.toISOString(),
    plan_end_time: values.plan_time?.[1]?.toISOString(),
    maintenance_type: values.maintenance_type,
    risk_level: values.risk_level,
    status: values.status,
    reason: values.reason,
  };
}

export default function MaintenancePage() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [ganttItems, setGanttItems] = useState<MaintenanceGanttItem[]>([]);
  const [deviceOptions, setDeviceOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [generateItems, setGenerateItems] = useState<MaintenanceGenerateItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<MaintenanceFormValues>();

  async function loadMaintenanceData() {
    setLoading(true);
    setError(null);
    try {
      const [devices, planResponse, ganttResponse] = await Promise.all([
        getCurrentDeviceStatus(),
        getMaintenancePlans(),
        getMaintenanceGantt(),
      ]);
      setDeviceOptions(devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id })));
      setPlans(planResponse);
      setGanttItems(ganttResponse.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "维护计划数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const overview = useMemo(() => {
    return {
      total: plans.length,
      pending: plans.filter((plan) => plan.status === "pending").length,
      highRisk: plans.filter((plan) => plan.risk_level === "high").length,
      conflict: ganttItems.filter((item) => item.conflict_task_ids.length > 0).length,
    };
  }, [ganttItems, plans]);

  async function handleGenerate(deviceIds: string[]) {
    setGenerating(true);
    setError(null);
    try {
      const response = await generateMaintenanceWindows({ device_ids: deviceIds });
      setGenerateItems(response.items);
      messageApi.success("维护窗口生成完成");
      await loadMaintenanceData();
    } catch (generateError) {
      messageApi.error(generateError instanceof Error ? generateError.message : "维护窗口生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function openEdit(plan: MaintenancePlan) {
    setEditingPlan(plan);
    form.setFieldsValue({
      plan_time: [dayjs(plan.plan_start_time), dayjs(plan.plan_end_time)],
      maintenance_type: plan.maintenance_type as MaintenanceFormValues["maintenance_type"],
      risk_level: plan.risk_level as MaintenanceFormValues["risk_level"],
      status: plan.status as MaintenanceFormValues["status"],
      reason: plan.reason ?? undefined,
    });
  }

  async function handleSave() {
    if (!editingPlan) {
      return;
    }

    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateMaintenancePlan(editingPlan.plan_id, toUpdatePayload(values));
      messageApi.success("维护计划已保存");
      setEditingPlan(null);
      await loadMaintenanceData();
    } catch (saveError) {
      if (saveError instanceof Error) {
        messageApi.error(saveError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planId: string) {
    try {
      await deleteMaintenancePlan(planId);
      messageApi.success("维护计划已删除");
      await loadMaintenanceData();
    } catch (deleteError) {
      messageApi.error(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  return (
    <section className="maintenance-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Predictive Maintenance</Text>
          <Title level={2}>预测性维护计划</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadMaintenanceData}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="维护计划总数">
            <strong>{overview.total}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="待确认计划">
            <strong>{overview.pending}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="高风险计划">
            <strong>{overview.highRisk}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="冲突窗口">
            <strong>{overview.conflict}</strong>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card" title="生成维护窗口">
        <MaintenanceWindowForm deviceOptions={deviceOptions} loading={generating} onGenerate={handleGenerate} />
      </Card>

      {generateItems.length > 0 ? (
        <Card className="dashboard-card" title="最近生成结果">
          <div className="maintenance-generate-result">
            {generateItems.map((item) => (
              <div className="maintenance-generate-item" key={item.device_id}>
                <div>
                  <strong>{item.device_id}</strong>
                  <p>{item.message}</p>
                </div>
                <MaintenanceConflictTag conflictTaskIds={item.conflict_task_ids} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="dashboard-card" title="维护窗口甘特图">
        <Skeleton loading={loading && ganttItems.length === 0} active paragraph={{ rows: 6 }}>
          <MaintenanceGanttChart items={ganttItems} />
        </Skeleton>
      </Card>

      <Card className="dashboard-card" title="维护计划表">
        <MaintenancePlanTable plans={plans} loading={loading} onEdit={openEdit} onDelete={handleDelete} />
      </Card>

      <Modal
        title="编辑维护计划"
        open={Boolean(editingPlan)}
        confirmLoading={saving}
        onCancel={() => setEditingPlan(null)}
        onOk={handleSave}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="维护时间" name="plan_time" rules={[{ required: true, message: "请选择维护时间" }]}>
            <DatePicker.RangePicker showTime className="full-width" />
          </Form.Item>
          <Form.Item label="维护类型" name="maintenance_type">
            <Select
              options={[
                { label: "检修", value: "repair" },
                { label: "更换", value: "replace" },
              ]}
            />
          </Form.Item>
          <Form.Item label="风险等级" name="risk_level">
            <Select
              options={[
                { label: "低", value: "low" },
                { label: "中", value: "medium" },
                { label: "高", value: "high" },
              ]}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { label: "待确认", value: "pending" },
                { label: "已确认", value: "confirmed" },
                { label: "执行中", value: "executing" },
                { label: "已完成", value: "finished" },
                { label: "已取消", value: "cancelled" },
              ]}
            />
          </Form.Item>
          <Form.Item label="原因" name="reason">
            <Select
              allowClear
              showSearch
              options={[
                { label: "HI 低于维护阈值", value: "HI 低于维护阈值" },
                { label: "RUL 低于维护阈值", value: "RUL 低于维护阈值" },
                { label: "故障概率升高", value: "故障概率升高" },
                { label: "维护窗口人工调整", value: "维护窗口人工调整" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
