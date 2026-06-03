import { Spin } from "antd";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function GuardLoading() {
  return (
    <div className="route-loading">
      <Spin size="large" />
    </div>
  );
}

export function RequireAuth() {
  const location = useLocation();
  const { token, user, status, refreshUser } = useAuth();

  useEffect(() => {
    if (token && status === "loading") {
      refreshUser().catch(() => undefined);
    }
  }, [refreshUser, status, token, user]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user || status === "loading") {
    return <GuardLoading />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { token, user, status, refreshUser } = useAuth();

  useEffect(() => {
    if (token && status === "loading") {
      refreshUser().catch(() => undefined);
    }
  }, [refreshUser, status, token, user]);

  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (token && status === "loading") {
    return <GuardLoading />;
  }

  return <Outlet />;
}
