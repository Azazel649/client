import { Tag, Tooltip } from "antd";

interface MaintenanceConflictTagProps {
  conflictTaskIds?: string[];
}

export default function MaintenanceConflictTag({ conflictTaskIds = [] }: MaintenanceConflictTagProps) {
  if (conflictTaskIds.length === 0) {
    return <Tag color="green">无冲突</Tag>;
  }

  return (
    <Tooltip title={conflictTaskIds.join(", ")}>
      <Tag color="red">{conflictTaskIds.length} 个冲突</Tag>
    </Tooltip>
  );
}
