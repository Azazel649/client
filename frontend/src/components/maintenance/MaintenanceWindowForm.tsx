import { Button, Form, Select } from "antd";
import { Wand2 } from "lucide-react";

interface MaintenanceWindowFormProps {
  deviceOptions: Array<{ label: string; value: string }>;
  loading?: boolean;
  onGenerate: (deviceIds: string[]) => void;
}

export default function MaintenanceWindowForm({ deviceOptions, loading, onGenerate }: MaintenanceWindowFormProps) {
  const [form] = Form.useForm<{ device_ids?: string[] }>();

  function handleFinish(values: { device_ids?: string[] }) {
    onGenerate(values.device_ids ?? []);
  }

  return (
    <Form form={form} layout="inline" onFinish={handleFinish}>
      <Form.Item label="设备" name="device_ids">
        <Select
          allowClear
          mode="multiple"
          className="wide-select"
          placeholder="不选择则批量生成"
          options={deviceOptions}
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<Wand2 size={16} />} loading={loading}>
          生成维护窗口
        </Button>
      </Form.Item>
    </Form>
  );
}
