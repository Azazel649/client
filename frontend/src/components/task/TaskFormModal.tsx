import { DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";

import type { ProductionTask, ProductionTaskCreate, ProductionTaskUpdate } from "../../types/task";

interface TaskFormValues {
  task_id?: string;
  task_name: string;
  product_type?: string;
  required_device_type?: string;
  duration: number;
  priority?: number;
  load_weight?: number;
  predecessor_task_id?: string;
  due_time?: dayjs.Dayjs;
  assigned_device?: string;
  plan_time?: [dayjs.Dayjs, dayjs.Dayjs];
  status?: string;
}

interface TaskFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  task: ProductionTask | null;
  deviceOptions: Array<{ label: string; value: string }>;
  deviceTypeOptions: Array<{ label: string; value: string }>;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ProductionTaskCreate | ProductionTaskUpdate) => void;
}

function toPayload(values: TaskFormValues, mode: "create" | "edit"): ProductionTaskCreate | ProductionTaskUpdate {
  const common = {
    task_name: values.task_name,
    product_type: values.product_type ?? null,
    required_device_type: values.required_device_type ?? null,
    duration: values.duration,
    priority: values.priority ?? 0,
    load_weight: values.load_weight ?? 1,
    predecessor_task_id: values.predecessor_task_id ?? null,
    due_time: values.due_time?.toISOString() ?? null,
    assigned_device: values.assigned_device ?? null,
    start_time: values.plan_time?.[0]?.toISOString() ?? null,
    end_time: values.plan_time?.[1]?.toISOString() ?? null,
    status: values.status ?? "pending",
  };

  if (mode === "create") {
    return {
      ...common,
      task_id: values.task_id ?? "",
    };
  }

  return common;
}

export default function TaskFormModal({
  open,
  mode,
  task,
  deviceOptions,
  deviceTypeOptions,
  saving,
  onCancel,
  onSubmit,
}: TaskFormModalProps) {
  const [form] = Form.useForm<TaskFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (mode === "edit" && task) {
      form.setFieldsValue({
        task_id: task.task_id,
        task_name: task.task_name,
        product_type: task.product_type ?? undefined,
        required_device_type: task.required_device_type ?? undefined,
        duration: task.duration ?? undefined,
        priority: task.priority,
        load_weight: task.load_weight,
        predecessor_task_id: task.predecessor_task_id ?? undefined,
        due_time: task.due_time ? dayjs(task.due_time) : undefined,
        assigned_device: task.assigned_device ?? undefined,
        plan_time: task.start_time && task.end_time ? [dayjs(task.start_time), dayjs(task.end_time)] : undefined,
        status: task.status,
      });
    } else {
      form.setFieldsValue({
        priority: 0,
        load_weight: 1,
        status: "pending",
      });
    }
  }, [form, mode, open, task]);

  async function handleOk() {
    const values = await form.validateFields();
    onSubmit(toPayload(values, mode));
  }

  return (
    <Modal
      title={mode === "create" ? "新建生产任务" : "编辑生产任务"}
      open={open}
      width={720}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="任务编号" name="task_id" rules={[{ required: mode === "create", message: "请输入任务编号" }]}>
          <Input disabled={mode === "edit"} placeholder="例如 TASK-001" />
        </Form.Item>
        <Form.Item label="任务名称" name="task_name" rules={[{ required: true, message: "请输入任务名称" }]}>
          <Input placeholder="请输入任务名称" />
        </Form.Item>
        <div className="task-form-grid">
          <Form.Item label="产品类型" name="product_type">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="设备类型要求" name="required_device_type">
            <Select allowClear showSearch options={deviceTypeOptions} placeholder="可选" />
          </Form.Item>
          <Form.Item label="工时" name="duration" rules={[{ required: true, message: "请输入工时" }]}>
            <InputNumber min={1} className="full-width" addonAfter="min" />
          </Form.Item>
          <Form.Item label="优先级" name="priority">
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item label="负载权重" name="load_weight">
            <InputNumber min={0.1} step={0.1} className="full-width" />
          </Form.Item>
          <Form.Item label="前置任务" name="predecessor_task_id">
            <Input placeholder="可选" />
          </Form.Item>
        </div>
        <Form.Item label="交期" name="due_time">
          <DatePicker showTime className="full-width" />
        </Form.Item>
        <Form.Item label="分配设备" name="assigned_device">
          <Select allowClear showSearch options={deviceOptions} placeholder="可选" />
        </Form.Item>
        <Form.Item label="计划时间" name="plan_time">
          <DatePicker.RangePicker showTime className="full-width" />
        </Form.Item>
        <Form.Item label="任务状态" name="status">
          <Select
            options={[
              { label: "待排程", value: "pending" },
              { label: "已排程", value: "scheduled" },
              { label: "执行中", value: "running" },
              { label: "已暂停", value: "paused" },
              { label: "已完成", value: "finished" },
              { label: "已取消", value: "cancelled" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
