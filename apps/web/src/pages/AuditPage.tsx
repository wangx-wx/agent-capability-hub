import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import {
  api,
  errorMessage,
  formatDateTime,
  formatDateTimeWithMs,
  formatDuration,
  isAbortError,
} from "../lib/api";
import { PageHeader } from "../components/layout/PageHeader";
import { FilterToolbar } from "../components/layout/FilterToolbar";
import { AuditAnalytics } from "../components/domain/AuditAnalytics";
import { AuditQueryForm, auditQueryParams, DEFAULT_AUDIT_QUERY, type AuditQuery } from "../components/domain/AuditQueryForm";
import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  SearchInput,
  Select,
  Skeleton,
  Tooltip,
  cn,
} from "../components/ui";
import type { AuditRecord, AuditResponse, AuditStats } from "../types";

const ALL_STATUS = "__all__";
const STATUS_META: Record<
  AuditRecord["status"],
  { label: string; tone: "ok" | "warn" | "err" | "neutral"; pulse?: boolean }
> = {
  running: { label: "进行中", tone: "warn", pulse: true },
  succeeded: { label: "成功", tone: "ok" },
  failed: { label: "失败", tone: "err" },
  unknown: { label: "结果未知", tone: "neutral" },
};

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [queryFilters, setQueryFilters] = useState(DEFAULT_AUDIT_QUERY);

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState("100");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const lastGoodOffsetRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery((prev) => {
        if (prev !== searchInput.trim()) {
          setOffset(0);
          lastGoodOffsetRef.current = 0;
        }
        return searchInput.trim();
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchAudit = useCallback(async (targetOffset: number, shouldScrollTop = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);

    const params = auditQueryParams(queryFilters);
    if (statusFilter !== ALL_STATUS) params.set("status", statusFilter);
    if (debouncedQuery) params.set("q", debouncedQuery);
    const statsParams = params.toString();
    params.set("offset", String(targetOffset));
    params.set("limit", limit);

    try {
      const [result, statistics] = await Promise.all([
        api<AuditResponse>(`/api/admin/audit?${params.toString()}`, { signal: controller.signal }),
        api<AuditStats>(`/api/admin/audit/stats?${statsParams}`, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setRecords(result.records);
      setStats(statistics);
      setTotal(result.total);
      setHasMore(result.hasMore);
      lastGoodOffsetRef.current = targetOffset;
      setError("");
      if (shouldScrollTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(errorMessage(reason));
      // Roll back offset to the last successfully displayed page on failure.
      setOffset(lastGoodOffsetRef.current);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [limit, statusFilter, debouncedQuery, queryFilters]);

  useEffect(() => {
    void fetchAudit(offset, false);
    return () => abortRef.current?.abort();
  }, [offset, fetchAudit]);

  const pageSize = Number(limit);
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goToOffset = (nextOffset: number) => {
    setOffset(nextOffset);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyQuery = (query: AuditQuery, reset = false) => {
    setQueryFilters({ ...query });
    setOffset(0);
    lastGoodOffsetRef.current = 0;
    if (reset) { setStatusFilter(ALL_STATUS); setSearchInput(""); setDebouncedQuery(""); }
  };

  return (
    <section className="flex flex-col min-w-0" aria-busy={refreshing}>
      <PageHeader
        title="调用审计"
        description="保留每次正式工具调用的用户、服务、工具名称、耗时与结果状态；管理员控制台试调用不写入审计。"
        actions={
          <Button
            variant="secondary"
            disabled={refreshing}
            aria-label="刷新审计"
            onClick={() => void fetchAudit(offset, false)}
          >
            <RefreshCw size={14} strokeWidth={1.75} className={cn(refreshing && "animate-spin")} />
            <span>刷新</span>
          </Button>
        }
      />

      <AuditQueryForm onApply={applyQuery} busy={refreshing} />

      <FilterToolbar
        left={
          <>
            <SearchInput
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder="搜索用户、服务、工具或客户端…"
              className="w-72 max-[768px]:w-full"
            />
            <Select
              aria-label="按调用状态筛选"
              value={statusFilter}
              onValueChange={(next) => {
                setStatusFilter(next);
                setOffset(0);
                lastGoodOffsetRef.current = 0;
              }}
              options={[
                { value: ALL_STATUS, label: "全部状态" },
                { value: "succeeded", label: "成功" },
                { value: "failed", label: "失败" },
                { value: "running", label: "进行中" },
                { value: "unknown", label: "结果未知" },
              ]}
            />
            <Select
              aria-label="每页显示条数"
              value={limit}
              onValueChange={(next) => {
                setLimit(next);
                setOffset(0);
                lastGoodOffsetRef.current = 0;
              }}
              options={[
                { value: "20", label: "每页 20 条" },
                { value: "50", label: "每页 50 条" },
                { value: "100", label: "每页 100 条" },
              ]}
            />
          </>
        }
        right={
          <span className="text-[12px] text-[#5B6270] tabular-nums">共 {total} 条记录</span>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[13px] text-[#B91C1C]"
        >
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => void fetchAudit(offset, false)}>
            重试
          </Button>
        </div>
      )}

      {!loading && stats && <AuditAnalytics stats={stats} />}

      {loading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table aria-label="审计记录" className="w-full text-left border-collapse">
              <thead className="bg-[#EEF0F4] border-b border-[#E2E5EC]">
                <tr className="text-[12px] font-medium text-[#4B5563]">
                  <th className="px-4 py-2.5 whitespace-nowrap">时间</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">用户</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">服务</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">工具</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">耗时</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">状态</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">客户端</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5EC] text-[13px]">
                {records.map((record) => {
                  const status = STATUS_META[record.status] ?? {
                    label: record.status,
                    tone: "neutral" as const,
                  };
                  const clientText =
                    [record.clientName, record.clientVersion].filter(Boolean).join(" ") || "—";

                  return (
                    <tr key={record.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-[#4B5563] tabular-nums">
                        <Tooltip content={formatDateTimeWithMs(record.createdAt)}>
                          <span>{formatDateTime(record.createdAt)}</span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <strong className="font-semibold text-[#111827]">{record.username}</strong>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#4B5563]">
                        {record.serviceName ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 max-w-[260px]">
                          <Tooltip content={record.toolName}>
                            <span className="font-mono text-[12px] text-[#111827] truncate">
                              {record.toolName}
                            </span>
                          </Tooltip>
                          <CopyButton
                            size="sm"
                            iconOnly
                            variant="ghost"
                            value={record.toolName}
                            ariaLabel={`复制工具名称 ${record.toolName}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-[#4B5563] tabular-nums">
                        {formatDuration(record.durationMs)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.status === "unknown" ? (
                          <Tooltip content="服务进程在调用尚未结束时重启，无法确认下游最终执行结果，系统不会自动重发。">
                            <span>
                              <Badge tone={status.tone} dot>
                                {status.label}
                              </Badge>
                            </span>
                          </Tooltip>
                        ) : (
                          <Badge tone={status.tone} dot pulse={status.pulse}>
                            {status.label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-[200px]">
                        <Tooltip content={clientText}>
                          <span className="font-mono text-[12px] text-[#4B5563] truncate block">
                            {clientText}
                          </span>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}

                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <EmptyState
                        icon={<ScrollText size={20} strokeWidth={1.75} />}
                        title="暂无匹配的调用审计记录"
                        description="正式通过 MCP 网关发起的调用将记录在此。"
                        className="border-0 py-6"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E5EC] bg-[#F5F6F8]/60 text-[12px] text-[#4B5563]">
            <span className="font-mono tabular-nums">
              第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={refreshing || offset === 0}
                onClick={() => goToOffset(Math.max(0, offset - pageSize))}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={refreshing || !hasMore}
                onClick={() => goToOffset(offset + pageSize)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
