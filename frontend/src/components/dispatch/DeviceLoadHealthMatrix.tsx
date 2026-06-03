import { Empty } from "antd";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";

import type { DispatchDeviceState } from "../../types/dispatch";

interface DeviceLoadHealthMatrixProps {
  devices: DispatchDeviceState[];
}

export default function DeviceLoadHealthMatrix({ devices }: DeviceLoadHealthMatrixProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const data = useMemo(
    () =>
      devices.map((device) => [
        Number(device.health_index.toFixed(2)),
        Number(device.current_load.toFixed(2)),
        device.task_count,
        device.device_id,
        Number(device.load_health_ratio.toFixed(3)),
      ]),
    [devices],
  );

  useEffect(() => {
    if (!chartRef.current || data.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#1677ff"],
      tooltip: {
        formatter: (params: { value: [number, number, number, string, number] }) => {
          const [health, load, taskCount, deviceId, ratio] = params.value;
          return [`设备：${deviceId}`, `HI：${health}`, `负载：${load}%`, `任务数：${taskCount}`, `负载/健康：${ratio}`].join(
            "<br/>",
          );
        },
      },
      grid: {
        top: 28,
        right: 26,
        bottom: 48,
        left: 58,
      },
      xAxis: {
        name: "HI",
        type: "value",
        min: 0,
        max: 100,
      },
      yAxis: {
        name: "负载率",
        type: "value",
        min: 0,
      },
      visualMap: {
        min: 0,
        max: Math.max(...devices.map((device) => device.task_count), 1),
        dimension: 2,
        right: 0,
        top: 12,
        calculable: true,
        inRange: {
          color: ["#91caff", "#1677ff", "#cf1322"],
        },
      },
      series: [
        {
          name: "设备负载-健康矩阵",
          type: "scatter",
          symbolSize: (value: number[]) => Math.max(12, Math.min(42, 12 + value[2] * 4)),
          data,
          markLine: {
            silent: true,
            lineStyle: { type: "dashed", color: "#d48806" },
            data: [{ xAxis: 30 }, { yAxis: 80 }],
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data, devices]);

  if (devices.length === 0) {
    return <Empty description="暂无设备负载健康数据" />;
  }

  return <div className="dispatch-matrix-chart" ref={chartRef} />;
}
