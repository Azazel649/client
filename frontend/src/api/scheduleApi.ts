import { request } from "./request";
import type {
  ScheduleAdjustRequest,
  ScheduleGantt,
  ScheduleMetrics,
  ScheduleOptimizeRequest,
  SchedulePlan,
  SchedulePlanItem,
} from "../types/schedule";

export function optimizeSchedule(payload: ScheduleOptimizeRequest) {
  return request.post<SchedulePlan, SchedulePlan>("/schedules/optimize", payload);
}

export function getCurrentSchedule() {
  return request.get<SchedulePlan, SchedulePlan>("/schedules/current");
}

export function getScheduleGantt(planId?: string | null) {
  return request.get<ScheduleGantt, ScheduleGantt>("/schedules/gantt", {
    params: planId ? { plan_id: planId } : undefined,
  });
}

export function adjustScheduleTask(payload: ScheduleAdjustRequest) {
  return request.post<SchedulePlanItem, SchedulePlanItem>("/schedules/adjust-task", payload);
}

export function confirmSchedule(planId: string) {
  return request.post<SchedulePlan, SchedulePlan>("/schedules/confirm", undefined, {
    params: { plan_id: planId },
  });
}

export function getScheduleMetrics(planId?: string | null) {
  return request.get<ScheduleMetrics, ScheduleMetrics>("/schedules/metrics", {
    params: planId ? { plan_id: planId } : undefined,
  });
}
