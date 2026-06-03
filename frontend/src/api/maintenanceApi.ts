import { request } from "./request";
import type { MaintenancePlan } from "../types/maintenance";

export function getMaintenancePlans() {
  return request.get<MaintenancePlan[], MaintenancePlan[]>("/maintenance/plans");
}
