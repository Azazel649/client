import { getUnhandledAlerts } from "./alertApi";
import { getCurrentDeviceStatus } from "./deviceApi";
import { getMaintenancePlans } from "./maintenanceApi";
import { getTasks } from "./taskApi";

export async function getDashboardOverview() {
  const [devices, alerts, tasks, maintenancePlans] = await Promise.all([
    getCurrentDeviceStatus(),
    getUnhandledAlerts(),
    getTasks(),
    getMaintenancePlans(),
  ]);

  return {
    devices,
    alerts,
    tasks,
    maintenancePlans,
  };
}
