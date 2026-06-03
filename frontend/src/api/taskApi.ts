import { request } from "./request";
import type { ProductionTask } from "../types/task";

export function getTasks() {
  return request.get<ProductionTask[], ProductionTask[]>("/tasks");
}
