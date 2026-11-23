import { useCallback, useEffect, useState } from "react";
import { FileInput, Pencil, Plug, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { ServiceEditor } from "../components/ServiceEditor";
import { ServiceOnboarding } from "../components/ServiceOnboarding";
import { ToolPanel } from "../components/ToolPanel";
import { connectionKindLabels, connectionLabels, type RegisteredTool, type Service } from "../types";

interface SyncPreview {
  id: string;
  added: RegisteredTool[];
  modified: RegisteredTool[];
  deleted: RegisteredTool[];
}

function connectionBadgeClass(service: Service): string {
  if (!service.enabled) return "badge";
  if (service.connectionStatus === "connected" || service.connectionStatus === "ready") {
    return "badge badge-ok";
  }
  if (service.connectionStatus === "authentication_failed") return "badge badge-err";
  return "badge badge-warn";
}

export function ServicesPage({ setError }: { setError: (value: string) => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Service | null>(null);
  const [editor, setEditor] = useState<{ initial?: Service } | null>(null);
  const [onboarding, setOnboarding] = useState<{ target?: Service } | null>(null);
  const [message, setMessage] = useState("");
  const [importedServices, setImportedServices] = useState<Service[]>([]);
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (id?: string) => {
      try {
        const result = await api<{ services: Service[] }>("/api/admin/services");
        setServices(result.services);
        if (id) setSelected(result.services.find((service) => service.id === id) ?? null);
      } catch (reason) {
        setError(errorMessage(reason));
      }
    },
    [setError],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loadTools = useCallback(async () => {
    if (!selected) {
      setTools([]);
      return;
    }
    const result = await api<{ tools: RegisteredTool[] }>(`/api/admin/services/${selected.id}/tools`);
    setTools(result.tools);
  }, [selected]);

  useEffect(() => {
    setPreview(null);
    void loadTools().catch((reason) => setError(errorMessage(reason)));
  }, [loadTools, setError]);

  const action = async (kind: "connect" | "sync" | "confirm" | "toggle") => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "sync") {
        const result = await api<{ preview: SyncPreview }>(
          `/api/admin/services/${selected.id}/sync-preview`,
          { method: "POST" },
        );
        setPreview(result.preview);
      }
      if (kind === "confirm" && preview) {
        await api(`/api/admin/services/${selected.id}/sync-confirm`, {
          method: "POST",
          body: JSON.stringify({ previewId: preview.id }),
        });
        setPreview(null);
        await loadTools();
      }
      if (kind === "connect") {
        const result = await api<{ error?: string }>(
          `/api/admin/services/${selected.id}/test-connection`,
          { method: "POST" },
        );
        if (result.error) setError(result.error);
      }
      if (kind === "toggle") {
        await api(`/api/admin/services/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: !selected.enabled }),
        });
      }
      if (kind !== "sync") await load(selected.id);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`删除服务 ${selected.name} 及其工具？历史审计保留。`)) return;
    try {
      await api(`/api/admin/services/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      setMessage("");
      setImportedServices([]);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">02</span>
            <span>能力接入</span>
          </p>
          <h1>MCP 服务</h1>
          <p className="section-description">
            统一管理服务与工具，通过原生 MCP 或 REST API 接入，在角色与授权页面分配访问权限。
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={() => void load(selected?.id)}>
            <RefreshCw size={14} strokeWidth={1.5} />
            <span>刷新服务</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => {
            setOnboarding({});
            setEditor(null);
            setMessage("");
            setImportedServices([]);
            setError("");
          }}>
            <Plus size={14} strokeWidth={1.5} />
            <span>接入服务</span>
          </button>
        </div>
      </div>

      {message && (
        <div role="status" className="status-banner service-notice">
          <p>{message}</p>
          {importedServices.length > 1 && (
            <div className="button-row import-result-links" role="group" aria-label="本次导入的服务">
              {importedServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={selected?.id === service.id}
                  onClick={() => {
                    setSelected(service);
                    void load(service.id);
                  }}
                >
                  查看 {service.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {onboarding ? (
        <ServiceOnboarding
          key={onboarding.target?.id ?? "new"}
          target={onboarding.target}
          onCancel={() => setOnboarding(null)}
          onSaved={(saved, imported) => {
            setOnboarding(null);
            setSelected(saved[0]);
            setImportedServices(imported ? saved : []);
            setMessage(imported ? `导入完成，共保存 ${saved.length} 个服务。请在角色与授权页面分配工具权限。` : "服务已保存，可继续配置工具。");
            void load(saved[0].id);
          }}
        />
      ) : editor ? (
        <ServiceEditor
          initial={editor.initial}
          onCancel={() => setEditor(null)}
          onSaved={(service) => {
            setEditor(null);
            void load(service.id);
          }}
        />
      ) : (
        <div className="service-split">
          <nav className="source-list" aria-label="已登记服务">
            {services.map((service) => (
              <button
                type="button"
                className={`source-item ${selected?.id === service.id ? "selected" : ""}`}
                key={service.id}
                onClick={() => {
                  setSelected(service);
                  setError("");
                }}
              >
                <div className="source-item-top">
                  <strong>{service.name}</strong>
                  <span className="badge badge-mono">{connectionKindLabels[service.kind]}</span>
                </div>
                <div className="source-item-meta">
                  <span>{service.namespace}</span>
                  <span>
                    {service.enabled
                      ? connectionLabels[service.connectionStatus] ?? service.connectionStatus
                      : "未启用"}
                  </span>
                </div>
              </button>
            ))}
            {!services.length && <p className="muted">尚未登记服务。</p>}
          </nav>

          <div>
            {selected ? (
              <div className="service-detail-surface">
                <div className="service-detail-header">
                  <h2>{selected.name}</h2>
                  <p className="address-text">{selected.url}</p>
                  <div className="service-meta-row">
                    <span className="badge badge-mono">{connectionKindLabels[selected.kind]}</span>
                    <span className="badge badge-mono">{selected.namespace}</span>
                    <span className={`badge ${selected.enabled ? "badge-ok" : ""}`}>
                      <span className="status-dot" />
                      {selected.enabled ? "已启用" : "未启用"}
                    </span>
                    <span className={connectionBadgeClass(selected)}>
                      {connectionLabels[selected.connectionStatus] ?? selected.connectionStatus}
                    </span>
                    <span className="badge badge-mono">超时 {selected.timeoutSeconds}s</span>
                  </div>
                </div>

                <div className="button-row source-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditor({ initial: selected })}
                  >
                    <Pencil size={13} strokeWidth={1.5} />
                    <span>编辑服务</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => void action("toggle")}
                  >
                    <Power size={13} strokeWidth={1.5} />
                    <span>{selected.enabled ? "停用服务" : "启用服务"}</span>
                  </button>
                  {selected.kind === "mcp" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => void action("connect")}
                      >
                        <Plug size={13} strokeWidth={1.5} />
                        <span>测试连接</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => void action("sync")}
                      >
                        <RefreshCw size={13} strokeWidth={1.5} />
                        <span>同步工具</span>
                      </button>
                    </>
                  )}
                  {selected.kind === "rest" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setOnboarding({ target: selected });
                        setMessage("");
                        setImportedServices([]);
                        setError("");
                      }}
                    >
                      <FileInput size={13} strokeWidth={1.5} />
                      <span>导入工具</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void remove()}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                    <span>删除服务</span>
                  </button>
                </div>

                {preview && (
                  <div className="change-preview">
                    <h2>同步差异</h2>
                    {(["added", "modified", "deleted"] as const).map((kind) => (
                      <div key={kind}>
                        <h3>
                          {{ added: "新增", modified: "更新", deleted: "删除" }[kind]}（
                          {preview[kind].length}）
                        </h3>
                        {preview[kind].map((tool) => (
                          <details key={tool.id ?? tool.name} className="tool-details">
                            <summary>{tool.name}</summary>
                            {kind === "modified" && (
                              <pre className="json-view">
                                {JSON.stringify(
                                  tools.find((old) => old.id === tool.id),
                                  null,
                                  2,
                                )}
                              </pre>
                            )}
                            <pre className="json-view">{JSON.stringify(tool, null, 2)}</pre>
                          </details>
                        ))}
                      </div>
                    ))}
                    <p className="muted">更新保留 ID 和授权；新工具默认未授权；确认删除会清理授权。</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => void action("confirm")}
                      >
                        确认同步
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPreview(null)}
                      >
                        取消同步
                      </button>
                    </div>
                  </div>
                )}

                <ToolPanel key={selected.id} service={selected} tools={tools} onChanged={loadTools} />
              </div>
            ) : (
              <div className="empty-surface">选择左侧已登记服务以查看配置详情与工具目录。</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
