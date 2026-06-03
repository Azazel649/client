import { createBrowserRouter, Navigate } from "react-router-dom";

import BasicLayout from "../layouts/BasicLayout";
import LoginLayout from "../layouts/LoginLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import DeviceDetailPage from "../pages/devices/DeviceDetailPage";
import DeviceListPage from "../pages/devices/DeviceListPage";
import LoginPage from "../pages/login/LoginPage";
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
          ...routeConfig
            .filter((route) => !["/dashboard", "/devices"].includes(route.path))
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
