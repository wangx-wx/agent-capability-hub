import { useEffect, useRef, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { formatDuration } from "../../lib/api";
import type { AuditStats } from "../../types";
import { EmptyState, Tooltip } from "../ui";

const SERIES = [
  { key: "total", label: "总调用", color: "#2563EB" },
  { key: "succeeded", label: "成功", color: "#15803D" },
  { key: "failed", label: "失败", color: "#DC2626" },
] as const;
const INTERVAL_LABELS = { hour: "每小时", day: "每日", month: "每月" };

function timeLabel(time: string, interval: AuditStats["interval"], full = false) {
  return new Date(time).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", year: full || interval === "month" ? "numeric" : undefined, month: "2-digit",
    day: interval === "month" ? undefined : "2-digit", hour: interval === "hour" ? "2-digit" : undefined,
    minute: interval === "hour" ? "2-digit" : undefined, hour12: false,
  });
}

export function AuditAnalytics({ stats }: { stats: AuditStats }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setActiveIndex(Math.max(0, stats.trend.length - 1)); }, [stats.trend]);

  const { summary, trend, interval } = stats;
  const active = trend[Math.min(activeIndex, trend.length - 1)];
  const chartWidth = width - 54;
  const height = 240;
  const baseline = 202;
  const step = Math.max(1, Math.ceil(Math.max(...trend.map((point) => point.total), 0) / 4));
  const x = (index: number) => 38 + (trend.length === 1 ? chartWidth / 2 : index * chartWidth / (trend.length - 1));
  const y = (value: number) => baseline - value / (step * 4) * 178;
  const tickIndexes = [...new Set(Array.from({ length: width < 500 ? 3 : 5 }, (_, index) =>
    Math.round(index * (trend.length - 1) / (width < 500 ? 2 : 4))))];
  const metrics = [
    { label: "总调用次数", value: String(summary.total), id: "audit-total", hint: `成功 ${summary.succeeded} · 进行中 ${summary.running} · 未知 ${summary.unknown}` },
    { label: "成功率", value: summary.successRate === null ? "—" : `${(summary.successRate * 100).toFixed(1)}%`, id: "audit-success-rate", hint: "成功次数 / 已结束次数" },
    { label: "失败调用", value: String(summary.failed), id: "audit-failed", hint: "已确认失败的正式调用" },
    { label: "平均耗时", value: formatDuration(summary.averageDurationMs), id: "audit-average-duration", hint: "仅统计已结束且有耗时的调用" },
  ];

  return (
    <section aria-label="审计统计" className="mb-4 min-w-0">
      <div className="grid grid-cols-2 min-[1100px]:grid-cols-4 gap-3 mb-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)]">
            <Tooltip content={metric.hint}><span className="text-[12px] text-[#4B5563]">{metric.label}</span></Tooltip>
            <strong data-testid={metric.id} className="block mt-2 font-mono text-[24px] font-semibold tabular-nums text-[#111827]">{metric.value}</strong>
            <p className="mt-1 text-[11px] text-[#5B6270] leading-relaxed">{metric.hint}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[#111827]">调用量趋势</h2>
            <p className="mt-1 text-[12px] text-[#5B6270]">{INTERVAL_LABELS[interval]}统计 · 北京时间 · 全部匹配记录</p>
          </div>
          <div className="flex gap-4 text-[12px] text-[#4B5563]">
            {SERIES.map((series) => <span key={series.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="w-4 border-t-2" style={{ borderColor: series.color, borderStyle: series.key === "failed" ? "dashed" : "solid" }} />{series.label}
            </span>)}
          </div>
        </div>
        <div ref={containerRef} className="w-full min-w-0">
          {summary.total === 0 ? <EmptyState icon={<ChartNoAxesCombined size={20} strokeWidth={1.75} />}
            title="暂无匹配的趋势数据" description="调整查询条件，或通过 MCP 网关发起正式调用。" className="border-0 py-10" /> : <>
            <svg role="group" aria-label="调用量趋势折线图" viewBox={`0 0 ${width} ${height}`} className="block w-full" style={{ height }}>
              {Array.from({ length: 5 }, (_, index) => <g key={index}>
                <line x1="38" x2={width - 16} y1={y(index * step)} y2={y(index * step)} stroke="#E2E5EC" strokeDasharray="3 4" />
                <text x="29" y={y(index * step) + 4} textAnchor="end" fill="#5B6270" fontSize="11">{index * step}</text>
              </g>)}
              {tickIndexes.map((index) => <text key={index} x={x(index)} y="228" textAnchor={index === 0 ? "start" : index === trend.length - 1 ? "end" : "middle"} fill="#5B6270" fontSize="11">
                {timeLabel(trend[index].time, interval)}
              </text>)}
              {SERIES.map((series) => <polyline key={series.key} fill="none" stroke={series.color} strokeWidth="2"
                strokeDasharray={series.key === "failed" ? "5 4" : undefined} points={trend.map((point, index) => `${x(index)},${y(point[series.key])}`).join(" ")} />)}
              {active && <line x1={x(activeIndex)} x2={x(activeIndex)} y1="18" y2={baseline} stroke="#9CA3AF" strokeDasharray="3 4" />}
              {trend.map((point, index) => <g key={point.time} tabIndex={0} role="img"
                aria-label={`${timeLabel(point.time, interval, true)}，总调用 ${point.total}，成功 ${point.succeeded}，失败 ${point.failed}`}
                onFocus={() => setActiveIndex(index)} onMouseEnter={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} className="outline-none cursor-crosshair">
                <rect x={x(index) - 8} y="18" width="16" height="188" fill="transparent" />
                <circle cx={x(index)} cy={y(point.total)} r={index === activeIndex ? 5 : 3} fill="#2563EB" stroke="white" strokeWidth="1.5" />
              </g>)}
            </svg>
            {active && <p aria-live="polite" className="text-[12px] text-[#4B5563] flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span>{timeLabel(active.time, interval, true)}</span><span>总调用 {active.total}</span>
              <span>成功 {active.succeeded}</span><span>失败 {active.failed}</span>
            </p>}
          </>}
        </div>
        {trend.length > 0 && <details className="mt-4 border-t border-[#E2E5EC] pt-3">
          <summary className="text-[12px] text-[#2563EB] cursor-pointer">查看趋势数据</summary>
          <div className="overflow-x-auto max-h-64 mt-3">
            <table aria-label="调用趋势数据" className="w-full text-left text-[12px] tabular-nums">
              <thead className="text-[#5B6270]"><tr><th className="py-2">北京时间</th><th>总调用</th><th>成功</th><th>失败</th></tr></thead>
              <tbody>{trend.map((point) => <tr key={point.time} className="border-t border-[#E2E5EC]">
                <td className="py-2 whitespace-nowrap">{timeLabel(point.time, interval, true)}</td><td>{point.total}</td><td>{point.succeeded}</td><td>{point.failed}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </details>}
      </div>
    </section>
  );
}
