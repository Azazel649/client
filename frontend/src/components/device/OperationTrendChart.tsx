import { Empty } from "antd";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";

import type { OperationLogPoint } from "../../types/device";

interface OperationTrendChartProps {
  points: OperationLogPoint[];
}

export default function OperationTrendChart({ points }: OperationTrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const sortedPoints = useMemo(
    () => [...points].sort((left, right) => dayjs(left.timestamp).valueOf() - dayjs(right.timestamp).valueOf()),
    [points],
  );

  useEffect(() => {
    if (!chartRef.current || sortedPoints.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    const xAxis = sortedPoints.map((point) => dayjs(point.timestamp).format("MM-DD HH:mm"));

    chart.setOption({
      color: ["#1677ff", "#1f9d55", "#d48806", "#cf1322", "#722ed1"],
      tooltip: {
        trigger: "axis",
      },
      legend: {
        top: 0,
      },
      grid: {
        top: 52,
        right: 24,
        bottom: 34,
        left: 48,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xAxis,
      },
      yAxis: {
        type: "value",
        scale: true,
      },
      series: [
        {
          name: "空气温度",
          type: "line",
          smooth: true,
          data: sortedPoints.map((point) => point.air_temp),
        },
        {
          name: "工艺温度",
          type: "line",
          smooth: true,
          data: sortedPoints.map((point) => point.process_temp),
        },
        {
          name: "转速",
          type: "line",
          smooth: true,
          data: sortedPoints.map((point) => point.rotational_speed),
        },
        {
          name: "扭矩",
          type: "line",
          smooth: true,
          data: sortedPoints.map((point) => point.torque),
        },
        {
          name: "工具磨损",
          type: "line",
          smooth: true,
          data: sortedPoints.map((point) => point.tool_wear),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [sortedPoints]);

  if (sortedPoints.length === 0) {
    return <Empty description="暂无运行参数趋势" />;
  }

  return <div className="operation-trend-chart" ref={chartRef} />;
}
