import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, errorMessage, formatDateTime } from "../lib/api";

interface AuditRecord {
  id: string;
  username: string;
  serviceName: string | null;
  toolName: string;
  createdAt: string;
  status: string;
  clientName: string | null;
  clientVersion: string | null;
}

const statusMeta: Record<string, { label: string; className: string }> = {
  running: { label: "进行中", className: "badge badge-warn" },
  succeeded: { label: "成功", className: "badge badge-ok" },
  failed: { label: "失败", className: "badge badge-err" },
  unknown: { label: "结果未知", className: "badge" },
};

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    void api<{ records: AuditRecord[] }>(`/api/admin/audit?offset=${offset}`)
      .then((result) => {
        setRecords(result.records);
        setError("");
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [offset, refresh]);

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">04</span>
            <span>正式工具调用</span>
          </p>
          <h1>调用审计</h1>
          <p className="section-description">
            保留调用当时的用户、服务和工具名称。管理员在控制台执行的试调用不写入审计。
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="刷新审计"
          title="刷新审计"
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginBottom: 14 }}>
          {error}
        </p>
      )}

      <div className="table-frame">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>服务</th>
                <th>工具</th>
                <th>状态</th>
                <th>客户端</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const status = statusMeta[record.status] ?? {
                  label: record.status,
                  className: "badge",
                };
                return (
                  <tr key={record.id}>
                    <td className="mono tabular">{formatDateTime(record.createdAt)}</td>
                    <td>
                      <strong>{record.username}</strong>
                    </td>
                    <td>{record.serviceName ?? "—"}</td>
                    <td className="mono">{record.toolName}</td>
                    <td>
                      <span className={status.className}>
                        <span className="status-dot" />
                        {status.label}
                      </span>
                    </td>
                    <td className="mono">
                      {[record.clientName, record.clientVersion].filter(Boolean).join(" ") || "—"}
                    </td>
                  </tr>
                );
              })}
              {!records.length && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {loading ? "正在加载…" : "暂无调用记录"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span className="pagination-page tabular">第 {offset / 100 + 1} 页</span>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || offset === 0}
              onClick={() => setOffset((value) => Math.max(0, value - 100))}
            >
              上一页
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || records.length < 100}
              onClick={() => setOffset((value) => value + 100)}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
