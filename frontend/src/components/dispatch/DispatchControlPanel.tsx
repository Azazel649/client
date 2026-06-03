import { Button, Checkbox, Form, Input, InputNumber } from "antd";
import { Play } from "lucide-react";

import type { DispatchRunRequest } from "../../types/dispatch";

interface DispatchControlPanelProps {
  loading?: boolean;
  onRun: (payload: DispatchRunRequest) => void;
}

interface DispatchFormValues {
  plan_name?: string;
  save_as_draft?: boolean;
  population_size: number;
  max_generation: number;
  mutation_rate: number;
  min_health_index: number;
}

export default function DispatchControlPanel({ loading, onRun }: DispatchControlPanelProps) {
  const [form] = Form.useForm<DispatchFormValues>();

  function handleFinish(values: DispatchFormValues) {
    onRun({
      plan_name: values.plan_name || null,
      save_as_draft: values.save_as_draft ?? true,
      population_size: values.population_size,
      max_generation: values.max_generation,
      mutation_rate: values.mutation_rate,
      min_health_index: values.min_health_index,
    });
  }

  return (
    <Form
      form={form}
      layout="inline"
      initialValues={{
        save_as_draft: true,
        population_size: 32,
        max_generation: 40,
        mutation_rate: 0.12,
        min_health_index: 30,
      }}
      onFinish={handleFinish}
    >
      <Form.Item label="方案名称" name="plan_name">
        <Input placeholder="可选" />
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
      <Form.Item label="最低HI" name="min_health_index" rules={[{ required: true }]}>
        <InputNumber min={0} max={100} />
      </Form.Item>
      <Form.Item name="save_as_draft" valuePropName="checked">
        <Checkbox>保存草稿</Checkbox>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<Play size={16} />} loading={loading}>
          运行自适应调度
        </Button>
      </Form.Item>
    </Form>
  );
}
