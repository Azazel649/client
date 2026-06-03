import { Empty } from "antd";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";

import type { HealthTrendPoint } from "../../types/health";

interface HealthTrendChartProps {
  points: HealthTrendPoint[];
  metric: "health_index" | "rul_minutes";
  title: string;
}

export default function HealthTrendChart({ points, metric, title }: HealthTrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const sortedPoints = useMemo(
    () => [...points].sort((left, right) => dayjs(left.eval_time).valueOf() - dayjs(right.eval_time).valueOf()),
    [points],
  );

  useEffect(() => {
    if (!chartRef.current || sortedPoints.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: metric === "health_index" ? ["#1677ff"] : ["#1f9d55"],
      tooltip: {
        trigger: "axis",
      },
      grid: {
        top: 32,
        left: 48,
        right: 20,
        bottom: 34,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: sortedPoints.map((point) => dayjs(point.eval_time).format("MM-DD HH:mm")),
      },
      yAxis: {
        type: "value",
        scale: true,
      },
      series: [
        {
          name: title,
          type: "line",
          smooth: true,
          areaStyle: {},
          data: sortedPoints.map((point) => {
            const value = point[metric];
            return metric === "rul_minutes" && value !== null ? Number((value / 60).toFixed(2)) : value;
          }),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [metric, sortedPoints, title]);

  if (sortedPoints.length === 0) {
    return <Empty description={`暂无${title}`} />;
  }

  return <div className="health-trend-chart" ref={chartRef} />;
}
