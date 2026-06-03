import { Empty } from "antd";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export interface HealthDistributionDatum {
  name: string;
  value: number;
}

interface HealthDistributionChartProps {
  data: HealthDistributionDatum[];
}

export default function HealthDistributionChart({ data }: HealthDistributionChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.every((item) => item.value === 0)) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#1f9d55", "#d48806", "#cf1322"],
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} 台 ({d}%)",
      },
      legend: {
        bottom: 0,
        left: "center",
      },
      series: [
        {
          name: "设备健康分布",
          type: "pie",
          radius: ["46%", "70%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          label: {
            formatter: "{b}\n{c} 台",
          },
          data,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data]);

  if (data.every((item) => item.value === 0)) {
    return <Empty description="暂无设备健康数据" />;
  }

  return <div className="health-chart" ref={chartRef} />;
}
