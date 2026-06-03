import { Empty } from "antd";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

import type { ModelMetric } from "../../types/model";

interface ModelMetricChartProps {
  metrics: ModelMetric[];
}

export default function ModelMetricChart({ metrics }: ModelMetricChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || metrics.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#1677ff"],
      tooltip: { trigger: "axis" },
      grid: { top: 28, left: 48, right: 18, bottom: 40 },
      xAxis: { type: "category", data: metrics.map((metric) => metric.metric_name) },
      yAxis: { type: "value", scale: true },
      series: [{ type: "bar", data: metrics.map((metric) => metric.metric_value), barMaxWidth: 42 }],
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [metrics]);

  if (metrics.length === 0) {
    return <Empty description="暂无模型指标" />;
  }

  return <div className="model-metric-chart" ref={chartRef} />;
}
