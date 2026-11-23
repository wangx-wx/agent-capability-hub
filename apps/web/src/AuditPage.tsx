import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, errorMessage } from "./api";

interface RecordEntry {
  id: string; username: string; serviceName: string | null; toolName: string; createdAt: string;
  status: string; clientName: string | null; clientVersion: string | null;
}
const statusLabels: Record<string, string> = { running: "进行中", succeeded: "成功", failed: "失败", unknown: "结果未知" };

export function AuditPage() {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    void api<{ records: RecordEntry[] }>(`/api/admin/audit?offset=${offset}`)
      .then((result) => { setRecords(result.records); setError(""); })
      .catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, [offset, refresh]);
  return <section>
    <div className="section-heading"><div><p className="eyebrow">正式工具调用</p><h1>调用审计</h1><p className="section-description">保留调用当时的用户、服务和工具名称。管理员试调用不记录。</p></div><button className="icon-button" aria-label="刷新审计" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} /></button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>时间</th><th>用户</th><th>服务</th><th>工具</th><th>状态</th><th>客户端</th></tr></thead><tbody>
      {records.map((record) => <tr key={record.id}><td>{new Date(record.createdAt).toLocaleString()}</td><td>{record.username}</td><td>{record.serviceName ?? "—"}</td><td>{record.toolName}</td><td>{statusLabels[record.status] ?? record.status}</td><td>{[record.clientName, record.clientVersion].filter(Boolean).join(" ") || "—"}</td></tr>)}
      {!records.length && <tr><td colSpan={6} className="empty-cell">{loading ? "正在加载…" : "暂无调用记录"}</td></tr>}
    </tbody></table></div>
    <div className="button-row"><button className="quiet-button" disabled={loading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - 100))}>上一页</button><span>第 {offset / 100 + 1} 页</span><button className="quiet-button" disabled={loading || records.length < 100} onClick={() => setOffset((value) => value + 100)}>下一页</button></div>
  </section>;
}
