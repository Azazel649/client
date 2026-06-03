import { Menu } from "antd";
import type { MenuProps } from "antd";
import { NavLink, useLocation } from "react-router-dom";

import { groupOrder, routeConfig } from "../router/routeConfig";

export default function SideMenu() {
  const location = useLocation();
  const selected = routeConfig.find((route) => location.pathname.startsWith(route.path))?.key;
  const items: MenuProps["items"] = groupOrder.map((group) => ({
    key: group,
    label: group,
    type: "group",
    children: routeConfig
      .filter((route) => route.group === group)
      .map((route) => ({
        key: route.key,
        icon: route.icon,
        label: <NavLink to={route.path}>{route.label}</NavLink>,
      })),
  }));

  return (
    <aside className="side-menu">
      <div className="brand-block">
        <span>MES</span>
        <div>
          <strong>智能生产执行</strong>
          <small>Fault Prediction Driven</small>
        </div>
      </div>
      <Menu mode="inline" selectedKeys={selected ? [selected] : []} items={items} />
    </aside>
  );
}
