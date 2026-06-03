import { Empty } from "antd";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";

import type { PredictionResult } from "../../types/prediction";

interface FaultProbabilityChartProps {
  prediction: PredictionResult | null;
}

const labels = [
  { key: "p_no_failure", name: "正常" },
  { key: "p_heat", name: "散热故障" },
  { key: "p_power", name: "供电故障" },
  { key: "p_overstrain", name: "过应力故障" },
  { key: "p_tool_wear", name: "工具磨损" },
] as const;

export default function FaultProbabilityChart({ prediction }: FaultProbabilityChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const values = useMemo(() => {
    if (!prediction) {
      return [];
    }

    return labels.map((item) => ({
      name: item.name,
      value: Number(((prediction[item.key] ?? 0) * 100).toFixed(2)),
    }));
  }, [prediction]);

  useEffect(() => {
    if (!chartRef.current || values.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#1677ff"],
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: number) => `${value.toFixed(2)}%`,
      },
      grid: {
        top: 24,
        left: 48,
        right: 18,
        bottom: 64,
      },
      xAxis: {
        type: "category",
        data: values.map((item) => item.name),
        axisLabel: {
          interval: 0,
        },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: {
          formatter: "{value}%",
        },
      },
      series: [
        {
          type: "bar",
          data: values.map((item) => item.value),
          barMaxWidth: 44,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [values]);

  if (!prediction) {
    return <Empty description="暂无故障概率" />;
  }

  return <div className="fault-probability-chart" ref={chartRef} />;
}
