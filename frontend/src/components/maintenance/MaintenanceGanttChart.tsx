import { Empty } from "antd";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";

import type { MaintenanceGanttItem } from "../../types/maintenance";

interface MaintenanceGanttChartProps {
  items: MaintenanceGanttItem[];
}

type RenderParams = {
  coordSys: { x: number; y: number; width: number; height: number };
};

export default function MaintenanceGanttChart({ items }: MaintenanceGanttChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const devices = useMemo(() => Array.from(new Set(items.map((item) => item.device_id))).sort(), [items]);

  useEffect(() => {
    if (!chartRef.current || items.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    const minTime = Math.min(...items.map((item) => dayjs(item.start_time).valueOf()));
    const maxTime = Math.max(...items.map((item) => dayjs(item.end_time).valueOf()));

    chart.setOption({
      tooltip: {
        formatter: (params: { value: [number, number, number, string, number] }) => {
          const [, start, end, title, conflictCount] = params.value;
          return [
            title,
            `${dayjs(start).format("MM-DD HH:mm")} - ${dayjs(end).format("MM-DD HH:mm")}`,
            conflictCount > 0 ? `冲突任务：${conflictCount} 个` : "无冲突",
          ].join("<br/>");
        },
      },
      grid: {
        top: 24,
        left: 96,
        right: 28,
        bottom: 52,
      },
      xAxis: {
        type: "time",
        min: minTime,
        max: maxTime,
      },
      yAxis: {
        type: "category",
        data: devices,
      },
      dataZoom: [
        {
          type: "inside",
          filterMode: "weakFilter",
        },
        {
          type: "slider",
          height: 20,
          bottom: 12,
          filterMode: "weakFilter",
        },
      ],
      series: [
        {
          type: "custom",
          renderItem(params: { coordSys: RenderParams["coordSys"] }, api: echarts.CustomSeriesRenderItemAPI) {
            const categoryIndex = api.value(0) as number;
            const start = api.coord([api.value(1), categoryIndex]) as number[];
            const end = api.coord([api.value(2), categoryIndex]) as number[];
            const size = api.size ? (api.size([0, 1]) as number[]) : [0, 40];
            const height = Math.min(28, size[1] * 0.58);
            const conflictCount = api.value(4) as number;
            const rect = echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: Math.max(end[0] - start[0], 2),
                height,
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height,
              },
            );

            if (!rect) {
              return undefined;
            }

            return {
              type: "rect",
              shape: rect,
              style: api.style({
                fill: conflictCount > 0 ? "#cf1322" : "#1677ff",
              }),
            };
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data: items.map((item) => [
            devices.indexOf(item.device_id),
            dayjs(item.start_time).valueOf(),
            dayjs(item.end_time).valueOf(),
            item.title,
            item.conflict_task_ids.length,
          ]),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [devices, items]);

  if (items.length === 0) {
    return <Empty description="暂无维护甘特数据" />;
  }

  return <div className="maintenance-gantt-chart" ref={chartRef} />;
}
