import { Breadcrumb } from "antd";
import { useLocation, useParams } from "react-router-dom";

import { routeByPath } from "../router/routeConfig";

export default function BreadcrumbBar() {
  const location = useLocation();
  const params = useParams();
  const current = routeByPath.get(location.pathname);

  if (location.pathname.startsWith("/devices/")) {
    return (
      <Breadcrumb
        className="breadcrumb-bar"
        items={[{ title: "首页" }, { title: "运行总览" }, { title: "设备状态监控" }, { title: params.deviceId }]}
      />
    );
  }

  return (
    <Breadcrumb
      className="breadcrumb-bar"
      items={[
        { title: "首页" },
        { title: current?.group ?? "运行总览" },
        { title: current?.label ?? "系统总览" },
      ]}
    />
  );
}
