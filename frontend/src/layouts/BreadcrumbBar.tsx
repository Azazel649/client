import { Breadcrumb } from "antd";
import { useLocation } from "react-router-dom";

import { routeByPath } from "../router/routeConfig";

export default function BreadcrumbBar() {
  const location = useLocation();
  const current = routeByPath.get(location.pathname);

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
