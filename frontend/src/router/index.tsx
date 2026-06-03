import { createBrowserRouter, Navigate } from "react-router-dom";

import BasicLayout from "../layouts/BasicLayout";
import LoginLayout from "../layouts/LoginLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import LoginPage from "../pages/login/LoginPage";
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
    element: <LoginLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <BasicLayout />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      ...routeConfig
        .filter((route) => route.path !== "/dashboard")
        .map((route) => ({
          path: route.path,
          element: <ModulePlaceholder title={route.label} description={route.description} />,
        })),
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
