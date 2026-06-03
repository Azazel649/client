import { Empty } from "antd";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";

import type { HealthTrendPoint } from "../../types/health";

interface HiDropChartProps {
  points: HealthTrendPoint[];
}

export default function HiDropChart({ points }: HiDropChartProps) {
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
      color: ["#cf1322"],
      tooltip: { trigger: "axis" },
      grid: { top: 28, left: 46, right: 18, bottom: 34 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: sortedPoints.map((point) => dayjs(point.eval_time).format("MM-DD HH:mm")),
      },
      yAxis: { type: "value", min: 0, max: 100 },
      series: [
        {
          name: "HI",
          type: "line",
          smooth: true,
          areaStyle: {},
          data: sortedPoints.map((point) => point.health_index),
          markLine: {
            silent: true,
            lineStyle: { type: "dashed", color: "#d48806" },
            data: [{ yAxis: 70 }, { yAxis: 30 }],
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
  }, [sortedPoints]);

  if (sortedPoints.length === 0) {
    return <Empty description="暂无 HI 骤降趋势" />;
  }

  return <div className="hi-drop-chart" ref={chartRef} />;
}
