import { Button, Card, Form, Input, Typography } from "antd";
import { Lock, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

const { Paragraph, Title } = Typography;

export default function LoginPage() {
  return (
    <section className="login-page">
      <div className="login-intro">
        <p className="page-eyebrow">Intelligent MES</p>
        <Title>基于故障预测的智能化生产执行系统</Title>
        <Paragraph>
          前端第一步已完成工程骨架、路由、全局样式与请求封装。登录接口对接与 token 状态将在第二步继续实现。
        </Paragraph>
      </div>
      <Card className="login-card">
        <Form layout="vertical" disabled>
          <Form.Item label="用户名">
            <Input prefix={<UserRound size={16} />} placeholder="第二步接入 /auth/login" />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password prefix={<Lock size={16} />} placeholder="第二步启用登录" />
          </Form.Item>
          <Button type="primary" block>
            登录
          </Button>
        </Form>
        <Link className="skeleton-link" to="/dashboard">
          进入空白后台布局
        </Link>
      </Card>
    </section>
  );
}
