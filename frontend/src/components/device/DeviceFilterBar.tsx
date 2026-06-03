import { Button, Input, Select, Space } from "antd";
import { Search, X } from "lucide-react";

export interface DeviceFilters {
  keyword: string;
  status: string;
  healthLevel: string;
  deviceType: string;
  workshop: string;
}

interface DeviceFilterBarProps {
  filters: DeviceFilters;
  statusOptions: string[];
  healthLevelOptions: string[];
  deviceTypeOptions: string[];
  workshopOptions: string[];
  onChange: (filters: DeviceFilters) => void;
}

function toOptions(values: string[]) {
  return values.filter(Boolean).map((value) => ({ label: value, value }));
}

export default function DeviceFilterBar({
  filters,
  statusOptions,
  healthLevelOptions,
  deviceTypeOptions,
  workshopOptions,
  onChange,
}: DeviceFilterBarProps) {
  function patch(next: Partial<DeviceFilters>) {
    onChange({ ...filters, ...next });
  }

  return (
    <div className="device-filter-bar">
      <Input
        allowClear
        prefix={<Search size={16} />}
        placeholder="搜索设备编号或名称"
        value={filters.keyword}
        onChange={(event) => patch({ keyword: event.target.value })}
      />
      <Select
        allowClear
        placeholder="状态"
        value={filters.status || undefined}
        options={toOptions(statusOptions)}
        onChange={(value) => patch({ status: value ?? "" })}
      />
      <Select
        allowClear
        placeholder="健康等级"
        value={filters.healthLevel || undefined}
        options={toOptions(healthLevelOptions)}
        onChange={(value) => patch({ healthLevel: value ?? "" })}
      />
      <Select
        allowClear
        placeholder="设备类型"
        value={filters.deviceType || undefined}
        options={toOptions(deviceTypeOptions)}
        onChange={(value) => patch({ deviceType: value ?? "" })}
      />
      <Select
        allowClear
        placeholder="车间"
        value={filters.workshop || undefined}
        options={toOptions(workshopOptions)}
        onChange={(value) => patch({ workshop: value ?? "" })}
      />
      <Space>
        <Button
          icon={<X size={16} />}
          onClick={() =>
            onChange({
              keyword: "",
              status: "",
              healthLevel: "",
              deviceType: "",
              workshop: "",
            })
          }
        >
          清空
        </Button>
      </Space>
    </div>
  );
}
