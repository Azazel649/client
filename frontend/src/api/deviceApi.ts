import { request } from "./request";
import type { DeviceCurrentStatus, DeviceDetail, OperationTrend } from "../types/device";

export function getCurrentDeviceStatus() {
  return request.get<DeviceCurrentStatus[], DeviceCurrentStatus[]>("/devices/current-status");
}

export function getDeviceDetail(deviceId: string) {
  return request.get<DeviceDetail, DeviceDetail>(`/devices/${deviceId}`);
}

export function getDeviceOperationTrend(deviceId: string, limit = 100) {
  return request.get<OperationTrend, OperationTrend>(`/devices/${deviceId}/operation-trend`, {
    params: { limit },
  });
}
