import { Empty } from "antd";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";

import type { ScheduleGanttItem } from "../../types/schedule";

interface ScheduleGanttChartProps {
  items: ScheduleGanttItem[];
}

export default function ScheduleGanttChart({ items }: ScheduleGanttChartProps) {
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
        formatter: (params: { value: [number, number, number, string, string, number] }) => {
          const [, start, end, title, itemType, delay] = params.value;
          return [
            title,
            `${dayjs(start).format("MM-DD HH:mm")} - ${dayjs(end).format("MM-DD HH:mm")}`,
            `类型：${itemType === "maintenance" ? "维护窗口" : "生产任务"}`,
            `延期：${delay} min`,
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
        { type: "inside", filterMode: "weakFilter" },
        { type: "slider", height: 20, bottom: 12, filterMode: "weakFilter" },
      ],
      series: [
        {
          type: "custom",
          renderItem(params: { coordSys: { x: number; y: number; width: number; height: number } }, api: echarts.CustomSeriesRenderItemAPI) {
            const categoryIndex = api.value(0) as number;
            const start = api.coord([api.value(1), categoryIndex]) as number[];
            const end = api.coord([api.value(2), categoryIndex]) as number[];
            const size = api.size ? (api.size([0, 1]) as number[]) : [0, 40];
            const height = Math.min(28, size[1] * 0.58);
            const itemType = api.value(4) as string;
            const delay = api.value(5) as number;
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
                fill: itemType === "maintenance" ? "#722ed1" : delay > 0 ? "#d48806" : "#1677ff",
              }),
            };
          },
          encode: { x: [1, 2], y: 0 },
          data: items.map((item) => [
            devices.indexOf(item.device_id),
            dayjs(item.start_time).valueOf(),
            dayjs(item.end_time).valueOf(),
            item.task_name ?? item.task_id ?? item.id,
            item.item_type,
            item.delay_minutes,
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
    return <Empty description="暂无联合排程甘特数据" />;
  }

  return <div className="schedule-gantt-chart" ref={chartRef} />;
}
