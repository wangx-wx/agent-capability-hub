import { useState, type FormEvent } from "react";
import { api, errorMessage } from "./api";
import type { Service } from "./service-types";

export function ServiceEditor({ initial, onSaved, onCancel }: { initial?: Service; onSaved: (service: Service) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [namespace, setNamespace] = useState(initial?.namespace ?? "");
  const [namespaceEdited, setNamespaceEdited] = useState(Boolean(initial));
  const [kind, setKind] = useState<Service["kind"]>(initial?.kind ?? "mcp");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [transport, setTransport] = useState(initial?.transport ?? "http");
  const [headers, setHeaders] = useState(JSON.stringify(initial?.headers ?? {}, null, 2));
  const [timeout, setTimeout] = useState(initial?.timeoutSeconds ?? 60);
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<Array<{ oldName: string; newName: string }> | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = { name, namespace: namespace || undefined, kind, url, transport, headers: JSON.parse(headers), timeoutSeconds: timeout, enabled, description };
      if (initial && impact === null) {
        const preview = await api<{ renamedTools: Array<{ oldName: string; newName: string }> }>(`/api/admin/services/${initial.id}/config-preview`, { method: "POST", body: JSON.stringify(body) });
        if (preview.renamedTools.length) { setImpact(preview.renamedTools); return; }
      }
      const result = await api<{ service: Service }>(initial ? `/api/admin/services/${initial.id}` : "/api/admin/services", { method: initial ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved(result.service);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  return <form className="form-stack editor-panel" onSubmit={(event) => void submit(event)} onChange={() => { if (impact) setImpact(null); }}>
    <h2>{initial ? "编辑服务" : "登记服务"}</h2>
    <div className="form-grid">
      <label>服务名称<input value={name} onChange={(event) => { setName(event.target.value); if (!namespaceEdited) setNamespace(event.target.value.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64)); }} required /></label>
      <label>命名空间<input value={namespace} onChange={(event) => { setNamespace(event.target.value); setNamespaceEdited(true); }} pattern="[A-Za-z0-9_.-]+" maxLength={64} /></label>
      <label>服务类型<select value={kind} onChange={(event) => setKind(event.target.value as Service["kind"])} disabled={Boolean(initial)}><option value="mcp">MCP</option><option value="rest">REST</option></select></label>
      {kind === "mcp" && <label>下游传输<select value={transport} onChange={(event) => setTransport(event.target.value as Service["transport"])}><option value="http">Streamable HTTP</option><option value="sse">旧 SSE</option></select></label>}
      <label className="full-width">服务地址<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://service.example/mcp" /></label>
      <label>调用超时（秒）<input type="number" min="0.001" step="0.001" value={timeout} onChange={(event) => setTimeout(Number(event.target.value))} required /></label>
      <label className="check-option"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />启用服务</label>
    </div>
    <label>凭证／固定请求头（JSON）<textarea className="json-editor" value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} /></label>
    <p className="muted">固定请求头由服务统一注入，调用参数不能覆盖。REST 配置有效且启用后即可调用。</p>
    <label>服务说明<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    {impact && <div className="change-preview"><h3>工具名称变更</h3>{impact.map((item) => <p key={item.oldName}>{item.oldName} → {item.newName}</p>)}<p className="muted">保存后旧名称立即失效，ID、授权及历史统计保留。</p></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="button-row"><button className="primary-button" disabled={busy}>{busy ? "保存中…" : impact ? "确认保存" : "保存服务"}</button><button className="quiet-button" type="button" onClick={onCancel}>取消</button></div>
  </form>;
}
