import { request } from "./request";
import type { DataReplayStatus, DataReplayStep } from "../types/dataReplay";

export function replayNextStep(params: { prediction_interval?: number; auto_predict?: boolean } = {}) {
  return request.post<DataReplayStep, DataReplayStep>("/data-replay/next", undefined, {
    params,
  });
}

export function getDataReplayStatus() {
  return request.get<DataReplayStatus, DataReplayStatus>("/data-replay/status");
}
