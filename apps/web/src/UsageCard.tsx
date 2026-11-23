import { useEffect, useState } from "react";
import { api, errorMessage } from "./api";

export function UsageCard({ refreshToken }: { refreshToken: number }) {
  const [usage, setUsage] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<NonNullable<typeof usage>>("/api/usage").then((result) => { setUsage(result); setError(""); })
      .catch((reason) => setError(errorMessage(reason)));
  }, [refreshToken]);
  return <>
    <div className="section-subheading"><h2>我的调用统计</h2><p>累计包含所有 API Key 的正式调用。进行中和结果未知只计入总次数，管理员试调用不计入。</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="summary-grid">
      <div className="summary-item"><span className="summary-label">总次数</span><strong data-testid="usage-total">{usage?.total ?? "—"}</strong></div>
      <div className="summary-item"><span className="summary-label">成功数</span><strong className="good-text" data-testid="usage-successful">{usage?.successful ?? "—"}</strong></div>
      <div className="summary-item"><span className="summary-label">失败数</span><strong className="bad-text" data-testid="usage-failed">{usage?.failed ?? "—"}</strong></div>
    </div>
  </>;
}
