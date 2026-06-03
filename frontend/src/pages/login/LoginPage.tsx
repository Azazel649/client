import { Button, Card, Form, Input, Typography, message } from "antd";
import { Lock, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import type { LoginRequest } from "../../types/auth";

const { Paragraph, Title } = Typography;

interface LoginLocationState {
  from?: Location;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form] = Form.useForm<LoginRequest>();
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const from = (location.state as LoginLocationState | null)?.from?.pathname ?? "/dashboard";

  async function handleSubmit(values: LoginRequest) {
    setSubmitting(true);
    try {
      await login(values);
      messageApi.success("登录成功");
      navigate(from, { replace: true });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="login-page">
      {contextHolder}
      <div className="login-intro">
        <p className="page-eyebrow">Intelligent MES</p>
        <Title>基于故障预测的智能化生产执行系统</Title>
        <Paragraph>
          围绕设备故障预测、HI/RUL 健康评估、维护决策与自适应调度构建生产执行闭环。
        </Paragraph>
      </div>
      <Card className="login-card">
        <Form form={form} layout="vertical" size="large" onFinish={handleSubmit}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserRound size={16} />} placeholder="请输入管理员账号" autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<Lock size={16} />} placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </section>
  );
}
