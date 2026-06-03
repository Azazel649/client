import { Alert, Button, Card, Col, Row, Select, Skeleton, Typography } from "antd";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import { getHiTrend, getLatestHealth, getLowHealthDevices, getRulTrend } from "../../api/healthApi";
import HealthMatrix from "../../components/health/HealthMatrix";
import HealthTrendChart from "../../components/health/HealthTrendChart";
import RiskExplainPanel from "../../components/health/RiskExplainPanel";
import type { HealthEvaluation, HealthTrend } from "../../types/health";

const { Text, Title } = Typography;

async function safeLatestHealth(deviceId: string) {
  try {
    return await getLatestHealth(deviceId);
  } catch {
    return null;
  }
}

export default function HealthPage() {
  const [records, setRecords] = useState<HealthEvaluation[]>([]);
  const [lowHealthRecords, setLowHealthRecords] = useState<HealthEvaluation[]>([]);
  const [deviceOptions, setDeviceOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [hiTrend, setHiTrend] = useState<HealthTrend | null>(null);
  const [rulTrend, setRulTrend] = useState<HealthTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHealthOverview() {
    setLoading(true);
    setError(null);
    try {
      const devices = await getCurrentDeviceStatus();
      setDeviceOptions(devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id })));
      setSelectedDeviceId((current) => current ?? devices[0]?.id);

      const latest = await Promise.all(devices.map((device) => safeLatestHealth(device.id)));
      setRecords(latest.filter((item): item is HealthEvaluation => Boolean(item)));
      setLowHealthRecords(await getLowHealthDevices(70));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "健康评估数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadTrends(deviceId: string) {
    setTrendLoading(true);
    try {
      const [hi, rul] = await Promise.all([getHiTrend(deviceId, 120), getRulTrend(deviceId, 120)]);
      setHiTrend(hi);
      setRulTrend(rul);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "健康趋势加载失败");
    } finally {
      setTrendLoading(false);
    }
  }

  useEffect(() => {
    loadHealthOverview();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      loadTrends(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.device_id === selectedDeviceId) ?? lowHealthRecords.find((record) => record.device_id === selectedDeviceId) ?? null,
    [lowHealthRecords, records, selectedDeviceId],
  );

  return (
    <section className="health-page">
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">HI/RUL Health Evaluation</Text>
          <Title level={2}>HI/RUL 健康评估</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadHealthOverview}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Skeleton loading={loading && records.length === 0} active paragraph={{ rows: 8 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card className="dashboard-card" title="健康状态矩阵">
              <HealthMatrix records={records} selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} />
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card
              className="dashboard-card"
              title="风险解释面板"
              extra={
                <Select
                  className="inline-select"
                  value={selectedDeviceId}
                  options={deviceOptions}
                  onChange={setSelectedDeviceId}
                />
              }
            >
              <RiskExplainPanel record={selectedRecord} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card className="dashboard-card" title="HI 趋势">
              <Skeleton loading={trendLoading} active paragraph={{ rows: 6 }}>
                <HealthTrendChart points={hiTrend?.points ?? []} metric="health_index" title="HI 趋势" />
              </Skeleton>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card className="dashboard-card" title="RUL 趋势">
              <Skeleton loading={trendLoading} active paragraph={{ rows: 6 }}>
                <HealthTrendChart points={rulTrend?.points ?? []} metric="rul_minutes" title="RUL 趋势" />
              </Skeleton>
            </Card>
          </Col>
          <Col span={24}>
            <Card className="dashboard-card" title="低健康设备">
              <HealthMatrix records={lowHealthRecords} selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} />
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </section>
  );
}
