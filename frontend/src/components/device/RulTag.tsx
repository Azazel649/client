import { Tag } from "antd";

interface RulTagProps {
  value: number;
}

export default function RulTag({ value }: RulTagProps) {
  const color = value < 24 ? "red" : value < 72 ? "orange" : "green";
  return <Tag color={color}>{value.toFixed(1)} h</Tag>;
}
