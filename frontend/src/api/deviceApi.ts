import { request } from "./request";
import type { DeviceCurrentStatus } from "../types/device";

export function getCurrentDeviceStatus() {
  return request.get<DeviceCurrentStatus[], DeviceCurrentStatus[]>("/devices/current-status");
}
