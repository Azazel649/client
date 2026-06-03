import { Alert, Button, Card, Input, Space, Typography } from "antd";
import { RefreshCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { getScheduleLogs } from "../../api/alertApi";
import ScheduleLogTable from "../../components/log/ScheduleLogTable";
import type { ScheduleLog } from "../../types/alert";

const { Text, Title } = Typography;

export default function LogPage() {
  const [logs, setLogs] = useState<ScheduleLog[]>([]);
  const [taskId, setTaskId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      setLogs(await getScheduleLogs({ limit: 200, task_id: taskId || undefined, reason: reason || undefined }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "日志数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <section className="support-page">
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">History Logs</Text>
          <Title level={2}>历史记录与调度日志</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadLogs}>
          刷新
        </Button>
      </div>
      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}
      <Card className="dashboard-card">
        <Space wrap>
          <Input className="short-filter" prefix={<Search size={16} />} placeholder="任务ID" value={taskId} onChange={(event) => setTaskId(event.target.value)} />
          <Input className="short-filter" placeholder="调度原因" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button onClick={loadLogs}>查询</Button>
        </Space>
      </Card>
      <Card className="dashboard-card" title="调度日志">
        <ScheduleLogTable logs={logs} loading={loading} />
      </Card>
    </section>
  );
}
