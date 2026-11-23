import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";
import { ServiceEditor } from "./ServiceEditor";
import { ToolPanel } from "./ToolPanel";
import { connectionLabels, type RegisteredTool, type Service } from "./service-types";

interface SyncPreview { id: string; added: RegisteredTool[]; modified: RegisteredTool[]; deleted: RegisteredTool[] }

export function ServicesPage({ setError }: { setError: (value: string) => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Service | null>(null);
  const [editor, setEditor] = useState<{ initial?: Service } | null>(null);
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (id?: string) => {
    try {
      const result = await api<{ services: Service[] }>("/api/admin/services"); setServices(result.services);
      if (id) setSelected(result.services.find((service) => service.id === id) ?? null);
    } catch (reason) { setError(errorMessage(reason)); }
  }, [setError]);
  useEffect(() => { void load(); }, [load]);
  const loadTools = useCallback(async () => {
    if (!selected) { setTools([]); return; }
    setTools((await api<{ tools: RegisteredTool[] }>(`/api/admin/services/${selected.id}/tools`)).tools);
  }, [selected]);
  useEffect(() => { setPreview(null); void loadTools().catch((reason) => setError(errorMessage(reason))); }, [loadTools, setError]);

  const action = async (kind: "connect" | "sync" | "confirm" | "toggle") => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      if (kind === "sync") setPreview((await api<{ preview: SyncPreview }>(`/api/admin/services/${selected.id}/sync-preview`, { method: "POST" })).preview);
      if (kind === "confirm" && preview) { await api(`/api/admin/services/${selected.id}/sync-confirm`, { method: "POST", body: JSON.stringify({ previewId: preview.id }) }); setPreview(null); await loadTools(); }
      if (kind === "connect") {
        const result = await api<{ error?: string }>(`/api/admin/services/${selected.id}/test-connection`, { method: "POST" });
        if (result.error) setError(result.error);
      }
      if (kind === "toggle") await api(`/api/admin/services/${selected.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !selected.enabled }) });
      if (kind !== "sync") await load(selected.id);
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || !window.confirm(`删除服务 ${selected.name} 及其工具？历史审计保留。`)) return;
    try { await api(`/api/admin/services/${selected.id}`, { method: "DELETE" }); setSelected(null); await load(); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  return <section>
    <div className="section-heading"><div><p className="eyebrow">能力接入</p><h1>MCP 服务</h1><p className="section-description">登记 MCP 或 REST 来源，确认工具目录后分配角色授权。</p></div><div className="button-row"><button className="quiet-button" onClick={() => void load(selected?.id)}>刷新服务</button><button className="primary-button" onClick={() => setEditor({})}>登记服务</button></div></div>
    {editor ? <ServiceEditor initial={editor.initial} onCancel={() => setEditor(null)} onSaved={(service) => { setEditor(null); void load(service.id); }} /> : <div className="service-split">
      <nav className="source-list" aria-label="已登记服务">{services.map((service) => <button className={`source-item ${selected?.id === service.id ? "selected" : ""}`} key={service.id} onClick={() => { setSelected(service); setError(""); }}><strong>{service.name}</strong><small>{service.kind.toUpperCase()} · {service.namespace}</small><span>{service.enabled ? connectionLabels[service.connectionStatus] ?? service.connectionStatus : "未启用"}</span></button>)}{!services.length && <p className="muted">尚未登记服务。</p>}</nav>
      <div>{selected ? <>
        <div className="subsection-heading"><div><h2>{selected.name}</h2><p className="address-text">{selected.url}</p><p>{selected.enabled ? "已启用" : "未启用"} · {connectionLabels[selected.connectionStatus] ?? selected.connectionStatus} · 超时 {selected.timeoutSeconds} 秒</p></div></div>
        <div className="button-row source-actions"><button className="quiet-button" onClick={() => setEditor({ initial: selected })}>编辑服务</button><button className="quiet-button" disabled={busy} onClick={() => void action("toggle")}>{selected.enabled ? "停用服务" : "启用服务"}</button>{selected.kind === "mcp" && <><button className="quiet-button" disabled={busy} onClick={() => void action("connect")}>测试连接</button><button className="primary-button" disabled={busy} onClick={() => void action("sync")}>同步工具</button></>}<button className="quiet-button danger-action" onClick={() => void remove()}>删除服务</button></div>
        {preview && <div className="change-preview"><h2>同步差异</h2>{(["added", "modified", "deleted"] as const).map((kind) => <div key={kind}><h3>{{ added: "新增", modified: "更新", deleted: "删除" }[kind]}（{preview[kind].length}）</h3>{preview[kind].map((tool) => <details key={tool.id ?? tool.name}><summary>{tool.name}</summary>{kind === "modified" && <pre className="json-view">{JSON.stringify(tools.find((old) => old.id === tool.id), null, 2)}</pre>}<pre className="json-view">{JSON.stringify(tool, null, 2)}</pre></details>)}</div>)}<p className="muted">更新保留 ID 和授权；新工具默认未授权；确认删除会清理授权。</p><div className="button-row"><button className="primary-button" disabled={busy} onClick={() => void action("confirm")}>确认同步</button><button className="quiet-button" onClick={() => setPreview(null)}>取消同步</button></div></div>}
        <ToolPanel key={selected.id} service={selected} tools={tools} onChanged={loadTools} />
      </> : <p className="muted">选择服务查看配置与工具。</p>}</div>
    </div>}
  </section>;
}
