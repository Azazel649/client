import { Alert, Button, Card, Skeleton, Typography } from "antd";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentDeviceStatus } from "../../api/deviceApi";
import DeviceFilterBar from "../../components/device/DeviceFilterBar";
import type { DeviceFilters } from "../../components/device/DeviceFilterBar";
import DeviceStatusTable from "../../components/device/DeviceStatusTable";
import type { DeviceCurrentStatus } from "../../types/device";

const { Text, Title } = Typography;

const defaultFilters: DeviceFilters = {
  keyword: "",
  status: "",
  healthLevel: "",
  deviceType: "",
  workshop: "",
};

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function matchesKeyword(device: DeviceCurrentStatus, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return `${device.id} ${device.name}`.toLowerCase().includes(normalized);
}

export default function DeviceListPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceCurrentStatus[]>([]);
  const [filters, setFilters] = useState<DeviceFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const response = await getCurrentDeviceStatus();
      setDevices(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "设备状态加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  const options = useMemo(
    () => ({
      statuses: unique(devices.map((device) => device.status)),
      healthLevels: unique(devices.map((device) => device.health_level)),
      deviceTypes: unique(devices.map((device) => device.device_type)),
      workshops: unique(devices.map((device) => device.workshop)),
    }),
    [devices],
  );

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      return (
        matchesKeyword(device, filters.keyword) &&
        (!filters.status || device.status === filters.status) &&
        (!filters.healthLevel || device.health_level === filters.healthLevel) &&
        (!filters.deviceType || device.device_type === filters.deviceType) &&
        (!filters.workshop || device.workshop === filters.workshop)
      );
    });
  }, [devices, filters]);

  return (
    <section className="device-page">
      <div className="dashboard-heading">
        <div>
          <Text type="secondary">Device Monitoring</Text>
          <Title level={2}>设备状态监控</Title>
        </div>
        <Button icon={<RefreshCcw size={16} />} loading={loading} onClick={loadDevices}>
          刷新
        </Button>
      </div>

      {error ? <Alert className="dashboard-alert" message={error} type="error" showIcon /> : null}

      <Card className="dashboard-card">
        <DeviceFilterBar
          filters={filters}
          statusOptions={options.statuses}
          healthLevelOptions={options.healthLevels}
          deviceTypeOptions={options.deviceTypes}
          workshopOptions={options.workshops}
          onChange={setFilters}
        />
      </Card>

      <Card
        className="dashboard-card"
        title="设备状态表"
        extra={<Text type="secondary">{filteredDevices.length} / {devices.length} 台</Text>}
      >
        <Skeleton loading={loading && devices.length === 0} active paragraph={{ rows: 8 }}>
          <DeviceStatusTable
            devices={filteredDevices}
            mode="full"
            onViewDetail={(deviceId) => navigate(`/devices/${encodeURIComponent(deviceId)}`)}
          />
        </Skeleton>
      </Card>
    </section>
  );
}
