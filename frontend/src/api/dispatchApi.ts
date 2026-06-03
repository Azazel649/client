import { request } from "./request";
import type { DispatchDeviceState, DispatchPlanResponse, DispatchRunRequest } from "../types/dispatch";

export function runAdaptiveDispatch(payload: DispatchRunRequest) {
  return request.post<DispatchPlanResponse, DispatchPlanResponse>("/dispatch/run", payload);
}

export function getCurrentDispatch() {
  return request.get<DispatchPlanResponse, DispatchPlanResponse>("/dispatch/current");
}

export function getDispatchDeviceStates() {
  return request.get<DispatchDeviceState[], DispatchDeviceState[]>("/dispatch/devices");
}
