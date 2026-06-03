import { Badge, Button, Space, Typography } from "antd";
import { Bell, LogOut, RefreshCcw } from "lucide-react";

const { Text } = Typography;

export default function HeaderBar() {
  return (
    <header className="header-bar">
      <div>
        <Text type="secondary">Intelligent MES</Text>
        <h1>基于故障预测的智能化生产执行系统</h1>
      </div>
      <Space size={12}>
        <Button icon={<RefreshCcw size={16} />} />
        <Badge count={0} size="small">
          <Button icon={<Bell size={16} />} />
        </Badge>
        <Button icon={<LogOut size={16} />}>退出</Button>
      </Space>
    </header>
  );
}
