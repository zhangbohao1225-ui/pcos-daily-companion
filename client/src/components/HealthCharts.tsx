import * as echarts from "echarts";
import { type ReactNode, useEffect, useRef } from "react";

type TrendPoint = { label: string; score: number; completion: number };
type DimensionPoint = { label: string; score: number };

const axisLabel = { color: "#839087", fontSize: 11 };
const splitLine = { lineStyle: { color: "#EDF1EC", type: "dashed" as const } };

function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="h-[260px] w-full min-w-0">{children}</div>;
}

export function HealthTrendChart({ points }: { points: TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption({
      animationDuration: 500,
      grid: { left: 6, right: 10, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: "axis", backgroundColor: "rgba(44, 67, 52, 0.94)", borderWidth: 0, textStyle: { color: "#fff", fontSize: 12 } },
      legend: { data: ["健康指数", "完成率"], right: 0, top: 0, textStyle: { color: "#718076", fontSize: 11 }, itemWidth: 10, itemHeight: 6 },
      xAxis: { type: "category", boundaryGap: false, data: points.map(point => point.label), axisTick: { show: false }, axisLine: { lineStyle: { color: "#E7ECE6" } }, axisLabel },
      yAxis: { type: "value", min: 0, max: 100, axisLabel: { ...axisLabel, formatter: "{value}" }, axisLine: { show: false }, axisTick: { show: false }, splitLine },
      series: [
        { name: "健康指数", type: "line", smooth: 0.35, data: points.map(point => point.score), showSymbol: false, lineStyle: { width: 3, color: "#5D8A68" }, itemStyle: { color: "#5D8A68" }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(108, 158, 113, 0.26)" }, { offset: 1, color: "rgba(108, 158, 113, 0.01)" }]) } },
        { name: "完成率", type: "line", smooth: 0.35, data: points.map(point => point.completion), showSymbol: false, lineStyle: { width: 2, type: "dashed", color: "#C98A71" }, itemStyle: { color: "#C98A71" } },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [points]);
  return <ChartFrame><div ref={ref} className="h-full w-full" /></ChartFrame>;
}

export function DimensionBarChart({ points }: { points: DimensionPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption({
      animationDuration: 500,
      grid: { left: 2, right: 20, top: 18, bottom: 4, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(44, 67, 52, 0.94)", borderWidth: 0, textStyle: { color: "#fff", fontSize: 12 }, formatter: (params: unknown) => { const point = (params as Array<{ value: number }>)[0]; return `达标率 ${point?.value ?? 0}%`; } },
      xAxis: { type: "value", max: 100, show: false },
      yAxis: { type: "category", inverse: true, data: points.map(point => point.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#647369", fontSize: 12, margin: 14 } },
      series: [{ type: "bar", data: points.map(point => ({ value: point.score, itemStyle: { color: point.score >= 75 ? "#6E9B72" : point.score >= 50 ? "#D9B36A" : "#D59A85", borderRadius: [0, 8, 8, 0] } })), barWidth: 12, showBackground: true, backgroundStyle: { color: "#EDF2EC", borderRadius: 8 }, label: { show: true, position: "right", color: "#718076", fontSize: 11, formatter: "{c}%" } }],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [points]);
  return <ChartFrame><div ref={ref} className="h-full w-full" /></ChartFrame>;
}
