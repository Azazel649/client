import { Alert, Button, Card, Col, Descriptions, Row, Skeleton, Statistic, Tabs, Typography } from "antd";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDeviceDetail, getDeviceOperationTrend } from "../../api/deviceApi";
import HealthIndexBar from "../../components/device/HealthIndexBar";
import OperationTrendChart from "../../components/device/OperationTrendChart";
import RulTag from "../../components/device/RulTag";
import DeviceStatusTag from "../../components/device/DeviceStatusTag";
import type { DeviceDetail, OperationTrend } from "../../types/device";

const { Text, Title } = Typography;

export default function DeviceDetailPage() {
  const navigate = useNavigate();
  const { deviceId = "" } = useParams();
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [trend, setTrend] = useState<OperationTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDeviceDetail() {
    if (!deviceId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [detailResponse, trendResponse] = await Promise.all([
        getDeviceDetail(deviceId),
        getDeviceOperationTrend(deviceId, 120),
      ]);
      setDetail(detailResponse);
      setTrend(trendResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "设备详情加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeviceDetail();
  }, [deviceId]);

  const current = detail?.current_status;

  return (
    <section className="device-page">
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Device Detail</Text>
          <Title level={2}>{detail?.device.device_name ?? deviceId}</Title>
        </div>
        <div className="detail-actions">
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate("/devices")}>
            返回
          </Button>
          <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadDeviceDetail}>
            刷新
          </Button>
        </div>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Skeleton loading={loading && !detail} active paragraph={{ rows: 8 }}>
        <Tabs
          className="device-detail-tabs"
          items={[
            {
              key: "status",
              label: "实时状态",
              children: (
                <div className="device-detail-grid">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12} xl={6}>
                      <Card className="dashboard-card">
                        <Statistic title="HI 健康指数" value={current?.health_index ?? 0} precision={1} />
                        <HealthIndexBar value={current?.health_index ?? 0} />
                      </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Card className="dashboard-card">
                        <Statistic title="RUL 剩余寿命" value={current?.rul_hours ?? 0} precision={1} suffix="h" />
                        {current ? <RulTag value={current.rul_hours} /> : null}
                      </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Card className="dashboard-card">
                        <Statistic title="负载率" value={current?.load_rate ?? 0} precision={1} suffix="%" />
                      </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Card className="dashboard-card">
                        <Statistic title="风险得分" value={current?.risk_score ?? 0} precision={1} />
                      </Card>
                    </Col>
                  </Row>

                  <Card className="dashboard-card" title="设备基础信息">
                    <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }}>
                      <Descriptions.Item label="设备编号">{detail?.device.device_id ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="设备名称">{detail?.device.device_name ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="设备类型">{detail?.device.device_type ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="车间">{detail?.device.workshop ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="状态">
                        {current ? <DeviceStatusTag status={current.status} /> : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="健康等级">{current?.health_level ?? "-"}</Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card className="dashboard-card" title="当前运行参数">
                    <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }}>
                      <Descriptions.Item label="空气温度">{current ? `${current.air_temperature.toFixed(1)} ℃` : "-"}</Descriptions.Item>
                      <Descriptions.Item label="工艺温度">
                        {current ? `${current.process_temperature.toFixed(1)} ℃` : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="转速">
                        {current ? `${current.rotational_speed} rpm` : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="扭矩">{current ? `${current.torque.toFixed(1)} Nm` : "-"}</Descriptions.Item>
                      <Descriptions.Item label="工具磨损">{current ? `${current.tool_wear} min` : "-"}</Descriptions.Item>
                      <Descriptions.Item label="最新故障概率">
                        {current ? `${(current.latest_fault_probability * 100).toFixed(1)}%` : "-"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              ),
            },
            {
              key: "trend",
              label: "运行参数趋势",
              children: (
                <Card className="dashboard-card" title="运行参数趋势">
                  <OperationTrendChart points={trend?.points ?? []} />
                </Card>
              ),
            },
          ]}
        />
      </Skeleton>
    </section>
  );
}
