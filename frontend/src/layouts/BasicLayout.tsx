import { Layout } from "antd";
import { Outlet } from "react-router-dom";

import BreadcrumbBar from "./BreadcrumbBar";
import HeaderBar from "./HeaderBar";
import SideMenu from "./SideMenu";

const { Content, Sider } = Layout;

export default function BasicLayout() {
  return (
    <Layout className="app-layout">
      <Sider className="app-sider" width={264} breakpoint="lg" collapsedWidth={0}>
        <SideMenu />
      </Sider>
      <Layout className="app-main-layout">
        <HeaderBar />
        <Content className="app-content">
          <BreadcrumbBar />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
