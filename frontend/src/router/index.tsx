import { createBrowserRouter, Navigate } from "react-router-dom";

import AlertPage from "../pages/alerts/AlertPage";
import BasicLayout from "../layouts/BasicLayout";
import LoginLayout from "../layouts/LoginLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import DispatchPage from "../pages/dispatch/DispatchPage";
import DeviceDetailPage from "../pages/devices/DeviceDetailPage";
import DeviceListPage from "../pages/devices/DeviceListPage";
import HealthPage from "../pages/health/HealthPage";
import LoginPage from "../pages/login/LoginPage";
import LogPage from "../pages/logs/LogPage";
import MaintenancePage from "../pages/maintenance/MaintenancePage";
import ModelPage from "../pages/models/ModelPage";
import PredictionCenterPage from "../pages/prediction/PredictionCenterPage";
import SchedulePage from "../pages/schedule/SchedulePage";
import TaskPage from "../pages/tasks/TaskPage";
import TransferPage from "../pages/transfer/TransferPage";
import { GuestOnly, RequireAuth } from "./RouteGuards";
import { routeConfig } from "./routeConfig";

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="page-placeholder">
      <p className="page-eyebrow">Module Scaffold</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <GuestOnly />,
    children: [
      {
        element: <LoginLayout />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <BasicLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/devices",
            element: <DeviceListPage />,
          },
          {
            path: "/devices/:deviceId",
            element: <DeviceDetailPage />,
          },
          {
            path: "/prediction",
            element: <PredictionCenterPage />,
          },
          {
            path: "/health",
            element: <HealthPage />,
          },
          {
            path: "/maintenance",
            element: <MaintenancePage />,
          },
          {
            path: "/tasks",
            element: <TaskPage />,
          },
          {
            path: "/schedule",
            element: <SchedulePage />,
          },
          {
            path: "/dispatch",
            element: <DispatchPage />,
          },
          {
            path: "/transfer",
            element: <TransferPage />,
          },
          {
            path: "/alerts",
            element: <AlertPage />,
          },
          {
            path: "/models",
            element: <ModelPage />,
          },
          {
            path: "/logs",
            element: <LogPage />,
          },
          ...routeConfig
            .filter(
              (route) =>
                ![
                  "/dashboard",
                  "/devices",
                  "/prediction",
                  "/health",
                  "/maintenance",
                  "/tasks",
                  "/schedule",
                  "/dispatch",
                  "/transfer",
                  "/alerts",
                  "/models",
                  "/logs",
                ].includes(route.path),
            )
            .map((route) => ({
              path: route.path,
              element: <ModulePlaceholder title={route.label} description={route.description} />,
            })),
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
