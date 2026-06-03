import { Modal, Descriptions } from "antd";

import type { TransferPlan } from "../../types/transfer";

interface TransferConfirmModalProps {
  open: boolean;
  plan: TransferPlan | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TransferConfirmModal({ open, plan, loading, onCancel, onConfirm }: TransferConfirmModalProps) {
  return (
    <Modal
      title="确认执行任务转移"
      open={open}
      confirmLoading={loading}
      okText="确认执行"
      cancelText="取消"
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ disabled: !plan?.feasible || (plan?.items.length ?? 0) === 0 }}
    >
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="异常设备">{plan?.anomaly_device_id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="转移任务数">{plan?.items.length ?? 0}</Descriptions.Item>
        <Descriptions.Item label="总延期">{plan ? `${plan.metrics.total_delay} min` : "-"}</Descriptions.Item>
        <Descriptions.Item label="负载均衡得分">{plan?.metrics.load_balance_score.toFixed(2) ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="可执行">{plan?.feasible ? "是" : "否"}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
