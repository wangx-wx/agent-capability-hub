import { useEffect, useState } from "react";
import { api, errorMessage, isAbortError } from "../lib/api";
import { Skeleton } from "./ui";

interface UsageStats {
  total: number;
  successful: number;
  failed: number;
}

/** Private cumulative usage summary card preserving data-testid assertions. */
export function UsageCard({ refreshToken }: { refreshToken: number }) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void api<UsageStats>("/api/usage", { signal: controller.signal })
      .then((result) => {
        setUsage(result);
        setError("");
      })
      .catch((reason) => {
        if (isAbortError(reason)) return;
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshToken]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between gap-4">
      <div>
        <h2 className="text-[16px] font-semibold text-[#111827]">我的调用统计</h2>
        <p className="mt-1 text-[12px] text-[#4B5563] leading-relaxed">
          累计包含你全部 API Key 的正式调用。进行中与结果未知仅计入总次数，管理员试调用不计入。
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      {loading && !usage ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="col-span-2 h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 rounded-[var(--radius-sm)] border border-[#E2E5EC] overflow-hidden">
          <div className="col-span-2 p-4 bg-[#F5F6F8]/80 border-b border-[#E2E5EC] flex flex-col gap-1">
            <span className="text-[12px] text-[#4B5563]">总次数</span>
            <strong
              data-testid="usage-total"
              className="font-mono text-[28px] leading-tight font-semibold text-[#111827] tabular-nums"
            >
              {usage?.total ?? "—"}
            </strong>
          </div>
          <div className="p-3.5 bg-white flex flex-col gap-1">
            <span className="text-[12px] text-[#4B5563]">成功数</span>
            <strong
              data-testid="usage-successful"
              className="font-mono text-[20px] leading-tight font-semibold text-[#15803D] tabular-nums"
            >
              {usage?.successful ?? "—"}
            </strong>
          </div>
          <div className="p-3.5 bg-white border-l border-[#E2E5EC] flex flex-col gap-1">
            <span className="text-[12px] text-[#4B5563]">失败数</span>
            <strong
              data-testid="usage-failed"
              className="font-mono text-[20px] leading-tight font-semibold text-[#B91C1C] tabular-nums"
            >
              {usage?.failed ?? "—"}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
