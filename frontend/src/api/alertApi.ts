import { request } from "./request";
import type { AlertEvent } from "../types/alert";

export function getUnhandledAlerts() {
  return request.get<AlertEvent[], AlertEvent[]>("/alerts/unhandled");
}
