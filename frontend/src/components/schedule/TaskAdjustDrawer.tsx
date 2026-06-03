import { DatePicker, Drawer, Form, Select, Button } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";

import type { ScheduleAdjustRequest, SchedulePlanItem } from "../../types/schedule";

interface AdjustFormValues {
  device_id: string;
  plan_time: [dayjs.Dayjs, dayjs.Dayjs];
}

interface TaskAdjustDrawerProps {
  open: boolean;
  planId?: string;
  item: SchedulePlanItem | null;
  deviceOptions: Array<{ label: string; value: string }>;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: ScheduleAdjustRequest) => void;
}

export default function TaskAdjustDrawer({ open, planId, item, deviceOptions, saving, onClose, onSubmit }: TaskAdjustDrawerProps) {
  const [form] = Form.useForm<AdjustFormValues>();

  useEffect(() => {
    if (open && item) {
      form.setFieldsValue({
        device_id: item.device_id,
        plan_time: [dayjs(item.start_time), dayjs(item.end_time)],
      });
    }
  }, [form, item, open]);

  async function handleSubmit() {
    if (!item || !planId) {
      return;
    }

    const values = await form.validateFields();
    onSubmit({
      plan_id: planId,
      task_id: item.task_id,
      device_id: values.device_id,
      start_time: values.plan_time[0].toISOString(),
      end_time: values.plan_time[1].toISOString(),
    });
  }

  return (
    <Drawer title="人工调整任务" open={open} width={460} onClose={onClose}>
      <Form form={form} layout="vertical">
        <Form.Item label="承接设备" name="device_id" rules={[{ required: true, message: "请选择设备" }]}>
          <Select showSearch options={deviceOptions} />
        </Form.Item>
        <Form.Item label="计划时间" name="plan_time" rules={[{ required: true, message: "请选择计划时间" }]}>
          <DatePicker.RangePicker showTime className="full-width" />
        </Form.Item>
        <Button type="primary" block loading={saving} onClick={handleSubmit}>
          保存调整
        </Button>
      </Form>
    </Drawer>
  );
}
