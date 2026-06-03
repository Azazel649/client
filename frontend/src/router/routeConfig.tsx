import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  Database,
  Factory,
  GitBranch,
  HeartPulse,
  History,
  LayoutDashboard,
  Network,
  Wrench,
} from "lucide-react";

export type AppRouteKey =
  | "dashboard"
  | "devices"
  | "prediction"
  | "health"
  | "maintenance"
  | "tasks"
  | "schedule"
  | "dispatch"
  | "transfer"
  | "alerts"
  | "models"
  | "logs";

export interface AppRouteConfig {
  key: AppRouteKey;
  path: string;
  label: string;
  group: string;
  icon: ReactNode;
  description: string;
}

export const routeConfig: AppRouteConfig[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    label: "系统总览",
    group: "运行总览",
    icon: <LayoutDashboard size={18} />,
    description: "展示设备健康、风险告警、任务与调度闭环概览。",
  },
  {
    key: "devices",
    path: "/devices",
    label: "设备状态监控",
    group: "运行总览",
    icon: <Factory size={18} />,
    description: "展示设备实时状态、HI、RUL、运行参数与风险信息。",
  },
  {
    key: "prediction",
    path: "/prediction",
    label: "故障预测",
    group: "故障预测与健康评估",
    icon: <BrainCircuit size={18} />,
    description: "围绕后端两阶段模型展示故障概率、风险等级与预测记录。",
  },
  {
    key: "health",
    path: "/health",
    label: "健康评估",
    group: "故障预测与健康评估",
    icon: <HeartPulse size={18} />,
    description: "展示 HI、RUL 与设备健康趋势，为维护决策提供依据。",
  },
  {
    key: "maintenance",
    path: "/maintenance",
    label: "维护计划",
    group: "维护与生产协同",
    icon: <Wrench size={18} />,
    description: "基于预测结果生成维护窗口、维护资源与计划方案。",
  },
  {
    key: "tasks",
    path: "/tasks",
    label: "生产任务",
    group: "维护与生产协同",
    icon: <ClipboardList size={18} />,
    description: "维护生产任务、工序、交期与优先级等基础数据。",
  },
  {
    key: "schedule",
    path: "/schedule",
    label: "调度排产",
    group: "自适应调度",
    icon: <BarChart3 size={18} />,
    description: "查看算法输出的设备任务分配、甘特排程与指标结果。",
  },
  {
    key: "dispatch",
    path: "/dispatch",
    label: "动态派工",
    group: "自适应调度",
    icon: <GitBranch size={18} />,
    description: "面向异常、故障与维护变更执行动态重调度。",
  },
  {
    key: "transfer",
    path: "/transfer",
    label: "任务转移",
    group: "自适应调度",
    icon: <Network size={18} />,
    description: "查看故障设备任务转移、替代设备与执行结果。",
  },
  {
    key: "alerts",
    path: "/alerts",
    label: "风险告警",
    group: "运行总览",
    icon: <AlertTriangle size={18} />,
    description: "集中呈现高风险设备、异常事件与待处理告警。",
  },
  {
    key: "models",
    path: "/models",
    label: "模型管理",
    group: "故障预测与健康评估",
    icon: <Database size={18} />,
    description: "管理预测模型、训练版本与后端模型服务状态。",
  },
  {
    key: "logs",
    path: "/logs",
    label: "操作日志",
    group: "运行总览",
    icon: <History size={18} />,
    description: "记录用户操作、调度执行与系统关键事件。",
  },
];

export const groupOrder = ["运行总览", "故障预测与健康评估", "维护与生产协同", "自适应调度"];

export const routeByPath = new Map(routeConfig.map((route) => [route.path, route]));
