import { Tag } from "antd";

interface AlertLevelTagProps {
  level: string;
}

export default function AlertLevelTag({ level }: AlertLevelTagProps) {
  const color = ["critical", "high", "danger"].includes(level)
    ? "red"
    : level === "medium" || level === "warning"
      ? "orange"
      : "blue";
  return <Tag color={color}>{level || "unknown"}</Tag>;
}
