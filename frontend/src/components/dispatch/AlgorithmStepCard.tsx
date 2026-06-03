import { Steps } from "antd";

interface AlgorithmStepCardProps {
  active?: number;
}

export default function AlgorithmStepCard({ active = 4 }: AlgorithmStepCardProps) {
  return (
    <Steps
      current={active}
      items={[
        { title: "读取状态", description: "加载设备 HI、RUL 与负载" },
        { title: "贪心分配", description: "优先匹配健康设备与高优先级任务" },
        { title: "遗传优化", description: "迭代降低延期与高风险负载" },
        { title: "生成方案", description: "输出任务-设备-时间窗口" },
        { title: "写入队列", description: "保存为可确认调度方案" },
      ]}
    />
  );
}
