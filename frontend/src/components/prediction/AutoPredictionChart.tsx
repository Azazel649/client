import { Empty } from "antd";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";

import type { PredictionRun } from "../../types/prediction";

interface AutoPredictionChartProps {
  runs: PredictionRun[];
}

function wearOf(run: PredictionRun) {
  return Number(run.prediction.predicted_params?.["Tool wear [min]"] ?? 0);
}

export default function AutoPredictionChart({ runs }: AutoPredictionChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const points = useMemo(
    () =>
      runs.map((run) => ({
        wear: Number(wearOf(run).toFixed(2)),
        probability: Number(((run.prediction.probability ?? 0) * 100).toFixed(2)),
        health: Number((run.health?.health_index ?? 0).toFixed(2)),
        fault: run.prediction.fault_type ?? "No Failure",
      })),
    [runs],
  );

  useEffect(() => {
    if (!chartRef.current || points.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#1677ff", "#52c41a"],
      tooltip: {
        trigger: "axis",
        formatter: (params: { marker: string; seriesName: string; value: number }[]) =>
          params.map((item) => `${item.marker}${item.seriesName}: ${item.value.toFixed(2)}`).join("<br/>"),
      },
      legend: {
        top: 0,
      },
      grid: {
        top: 48,
        left: 48,
        right: 48,
        bottom: 42,
      },
      xAxis: {
        type: "category",
        name: "Tool wear",
        data: points.map((point) => point.wear),
      },
      yAxis: [
        {
          type: "value",
          name: "Probability",
          min: 0,
          max: 100,
          axisLabel: { formatter: "{value}%" },
        },
        {
          type: "value",
          name: "HI",
          min: 0,
          max: 100,
        },
      ],
      series: [
        {
          name: "Fault probability",
          type: "line",
          smooth: true,
          data: points.map((point) => point.probability),
        },
        {
          name: "HI",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: points.map((point) => point.health),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [points]);

  if (points.length === 0) {
    return <Empty description="暂无自动预测结果" />;
  }

  return <div className="auto-prediction-chart" ref={chartRef} />;
}
