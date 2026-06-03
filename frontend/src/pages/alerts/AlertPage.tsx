import { Alert, Button, Card, Select, Space, Typography, message } from "antd";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAlerts, handleAlert } from "../../api/alertApi";
import AlertDetailDrawer from "../../components/alert/AlertDetailDrawer";
import AlertTable from "../../components/alert/AlertTable";
import type { AlertEvent } from "../../types/alert";

const { Text, Title } = Typography;

export default function AlertPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [handledFilter, setHandledFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    try {
      setAlerts(await getAlerts({ is_handled: handledFilter, alert_type: typeFilter, limit: 200 }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "告警数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [handledFilter, typeFilter]);

  const typeOptions = useMemo(
    () => Array.from(new Set(alerts.map((item) => item.alert_type))).map((value) => ({ label: value, value })),
    [alerts],
  );

  async function handleMark(alertId: string) {
    try {
      await handleAlert(alertId);
      messageApi.success("告警已处理");
      await loadAlerts();
    } catch (markError) {
      messageApi.error(markError instanceof Error ? markError.message : "处理告警失败");
    }
  }

  return (
    <section className="support-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Alert Center</Text>
          <Title level={2}>告警中心</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadAlerts}>
          刷新
        </Button>
      </div>
      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}
      <Card className="dashboard-card">
        <Space wrap>
          <Select
            allowClear
            className="short-filter"
            placeholder="处理状态"
            value={handledFilter}
            options={[
              { label: "未处理", value: 0 },
              { label: "已处理", value: 1 },
            ]}
            onChange={setHandledFilter}
          />
          <Select allowClear className="short-filter" placeholder="告警类型" value={typeFilter} options={typeOptions} onChange={setTypeFilter} />
        </Space>
      </Card>
      <Card className="dashboard-card" title="告警列表" extra={<Text type="secondary">{alerts.length} 条</Text>}>
        <AlertTable alerts={alerts} loading={loading} onView={setSelectedAlert} onHandle={handleMark} />
      </Card>
      <AlertDetailDrawer alert={selectedAlert} open={Boolean(selectedAlert)} onClose={() => setSelectedAlert(null)} />
    </section>
  );
}
