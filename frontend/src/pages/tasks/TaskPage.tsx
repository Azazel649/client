import { Alert, Button, Card, Col, Input, Row, Select, Skeleton, Space, Typography, message } from "antd";
import { Plus, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import { createTask, deleteTask, getDeviceTaskQueue, getTasks, updateTask } from "../../api/taskApi";
import TaskFormModal from "../../components/task/TaskFormModal";
import TaskQueueDrawer from "../../components/task/TaskQueueDrawer";
import TaskTable from "../../components/task/TaskTable";
import type { DeviceCurrentStatus } from "../../types/device";
import type { ProductionTask, ProductionTaskCreate, ProductionTaskUpdate, TaskQueue } from "../../types/task";

const { Text, Title } = Typography;

const statusOptions = [
  { label: "全部状态", value: "" },
  { label: "待排程", value: "pending" },
  { label: "已排程", value: "scheduled" },
  { label: "执行中", value: "running" },
  { label: "已暂停", value: "paused" },
  { label: "已完成", value: "finished" },
  { label: "已取消", value: "cancelled" },
];

function matchKeyword(task: ProductionTask, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return `${task.task_id} ${task.task_name} ${task.product_type ?? ""}`.toLowerCase().includes(normalized);
}

export default function TaskPage() {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [devices, setDevices] = useState<DeviceCurrentStatus[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingTask, setEditingTask] = useState<ProductionTask | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [queueOpen, setQueueOpen] = useState(false);
  const [queue, setQueue] = useState<TaskQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const [taskResponse, deviceResponse] = await Promise.all([getTasks(), getCurrentDeviceStatus()]);
      setTasks(taskResponse);
      setDevices(deviceResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "生产任务数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => matchKeyword(task, keyword) && (!statusFilter || task.status === statusFilter));
  }, [keyword, statusFilter, tasks]);

  const overview = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      running: tasks.filter((task) => task.status === "running").length,
      finished: tasks.filter((task) => ["finished", "completed"].includes(task.status)).length,
    }),
    [tasks],
  );

  const deviceOptions = useMemo(
    () => devices.map((device) => ({ label: `${device.name} (${device.id})`, value: device.id })),
    [devices],
  );

  const deviceTypeOptions = useMemo(() => {
    return Array.from(new Set(devices.map((device) => device.device_type).filter((value): value is string => Boolean(value))))
      .sort()
      .map((value) => ({ label: value, value }));
  }, [devices]);

  function openCreateModal() {
    setModalMode("create");
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task: ProductionTask) {
    setModalMode("edit");
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSubmit(payload: ProductionTaskCreate | ProductionTaskUpdate) {
    setSaving(true);
    try {
      if (modalMode === "create") {
        await createTask(payload as ProductionTaskCreate);
        messageApi.success("生产任务已创建");
      } else if (editingTask) {
        await updateTask(editingTask.task_id, payload as ProductionTaskUpdate);
        messageApi.success("生产任务已更新");
      }
      setModalOpen(false);
      await loadTasks();
    } catch (submitError) {
      messageApi.error(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(task: ProductionTask, status: string) {
    try {
      await updateTask(task.task_id, { status });
      messageApi.success("任务状态已更新");
      await loadTasks();
    } catch (statusError) {
      messageApi.error(statusError instanceof Error ? statusError.message : "状态更新失败");
    }
  }

  async function handleDelete(taskId: string) {
    try {
      await deleteTask(taskId);
      messageApi.success("任务已删除");
      await loadTasks();
    } catch (deleteError) {
      messageApi.error(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  async function handleViewQueue(deviceId: string) {
    setQueueOpen(true);
    setQueueLoading(true);
    try {
      setQueue(await getDeviceTaskQueue(deviceId));
    } catch (queueError) {
      messageApi.error(queueError instanceof Error ? queueError.message : "任务队列加载失败");
    } finally {
      setQueueLoading(false);
    }
  }

  return (
    <section className="task-page">
      {contextHolder}
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Production Task Management</Text>
          <Title level={2}>生产任务管理</Title>
        </div>
        <Space wrap>
          <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadTasks}>
            刷新
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            新建任务
          </Button>
        </Space>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="任务总数">
            <strong>{overview.total}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="待排程">
            <strong>{overview.pending}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="执行中">
            <strong>{overview.running}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-card" title="已完成">
            <strong>{overview.finished}</strong>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card">
        <div className="task-toolbar">
          <Input
            allowClear
            prefix={<Search size={16} />}
            placeholder="搜索任务编号、名称或产品类型"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        </div>
      </Card>

      <Card className="dashboard-card" title="生产任务列表" extra={<Text type="secondary">{filteredTasks.length} 条</Text>}>
        <Skeleton loading={loading && tasks.length === 0} active paragraph={{ rows: 8 }}>
          <TaskTable
            tasks={filteredTasks}
            loading={loading}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onViewQueue={handleViewQueue}
          />
        </Skeleton>
      </Card>

      <TaskFormModal
        open={modalOpen}
        mode={modalMode}
        task={editingTask}
        deviceOptions={deviceOptions}
        deviceTypeOptions={deviceTypeOptions}
        saving={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <TaskQueueDrawer open={queueOpen} queue={queue} loading={queueLoading} onClose={() => setQueueOpen(false)} />
    </section>
  );
}
