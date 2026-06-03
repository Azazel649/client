import { Badge, Button, Space, Tag, Tooltip, Typography } from "antd";
import { Bell, LogOut, RefreshCcw, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const { Text } = Typography;

export default function HeaderBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = user?.real_name || user?.username || "管理员";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="header-bar">
      <div>
        <Text type="secondary">Intelligent MES</Text>
        <h1>基于故障预测的智能化生产执行系统</h1>
      </div>
      <Space size={12} wrap>
        <Tooltip title="刷新当前页面">
          <Button icon={<RefreshCcw size={16} />} onClick={() => window.location.reload()} />
        </Tooltip>
        <Tooltip title="未处理告警">
          <Badge count={0} size="small">
            <Button icon={<Bell size={16} />} />
          </Badge>
        </Tooltip>
        <span className="user-chip">
          <UserRound size={16} />
          <span>{displayName}</span>
          {user?.role ? <Tag>{user.role}</Tag> : null}
        </span>
        <Button icon={<LogOut size={16} />} loading={loggingOut} onClick={handleLogout}>
          退出
        </Button>
      </Space>
    </header>
  );
}
