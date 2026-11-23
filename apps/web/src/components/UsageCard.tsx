import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";

interface UsageStats {
  total: number;
  successful: number;
  failed: number;
}

export function UsageCard({ refreshToken }: { refreshToken: number }) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<UsageStats>("/api/usage")
      .then((result) => {
        setUsage(result);
        setError("");
      })
      .catch((reason) => setError(errorMessage(reason)));
  }, [refreshToken]);

  return (
    <div className="overview-usage-col">
      <div className="panel-kicker">
        <h2>我的调用统计</h2>
        <span>USAGE</span>
      </div>
      <p className="muted">
        累计包含所有 API Key 的正式调用。进行中和结果未知仅计入总次数，管理员试调用不计入。
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="usage-bento">
        <div className="usage-cell usage-cell-total">
          <span className="usage-label">总次数</span>
          <strong className="usage-number-lg tabular" data-testid="usage-total">
            {usage?.total ?? "—"}
          </strong>
        </div>
        <div className="usage-cell usage-cell-split">
          <span className="usage-label">成功数</span>
          <strong className="usage-number-md tabular good-text" data-testid="usage-successful">
            {usage?.successful ?? "—"}
          </strong>
        </div>
        <div className="usage-cell usage-cell-split">
          <span className="usage-label">失败数</span>
          <strong className="usage-number-md tabular bad-text" data-testid="usage-failed">
            {usage?.failed ?? "—"}
          </strong>
        </div>
      </div>
    </div>
  );
}
