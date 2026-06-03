import { Drawer, Empty, List, Tag } from "antd";
import dayjs from "dayjs";

import type { TaskQueue } from "../../types/task";
import TaskStatusTag from "./TaskStatusTag";

interface TaskQueueDrawerProps {
  open: boolean;
  queue: TaskQueue | null;
  loading?: boolean;
  onClose: () => void;
}

export default function TaskQueueDrawer({ open, queue, loading, onClose }: TaskQueueDrawerProps) {
  return (
    <Drawer title={queue ? `设备 ${queue.device_id} 任务队列` : "设备任务队列"} open={open} width={520} onClose={onClose}>
      <List
        loading={loading}
        dataSource={queue?.tasks ?? []}
        locale={{ emptyText: <Empty description="暂无任务队列" /> }}
        renderItem={(task) => (
          <List.Item>
            <List.Item.Meta
              title={
                <span className="task-queue-title">
                  <strong>{task.task_name}</strong>
                  <TaskStatusTag status={task.status} />
                </span>
              }
              description={
                <div className="task-queue-meta">
                  <span>{task.task_id}</span>
                  {task.duration ? <Tag>{task.duration} min</Tag> : null}
                  {task.start_time ? <span>{dayjs(task.start_time).format("MM-DD HH:mm")}</span> : null}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Drawer>
  );
}
