import { useState } from "react";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { RegisteredTool, Service } from "../types";

interface ToolPanelProps {
  service: Service;
  tools: RegisteredTool[];
  onChanged: () => Promise<void>;
}

export function ToolPanel({ service, tools, onChanged }: ToolPanelProps) {
  const [trial, setTrial] = useState<RegisteredTool | null>(null);
  const [args, setArgs] = useState("{}");
  const [result, setResult] = useState<unknown>(null);
  const [editing, setEditing] = useState<{ id?: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const execute = async () => {
    if (!trial) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await api<{ result: unknown }>(
        `/api/admin/services/${service.id}/tools/${trial.id}/test`,
        { method: "POST", body: JSON.stringify({ arguments: JSON.parse(args) }) },
      );
      setResult(response.result);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/services/${service.id}/tools${editing.id ? `/${editing.id}` : ""}`, {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify(JSON.parse(editing.text)),
      });
      setEditing(null);
      await onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tool: RegisteredTool) => {
    if (!window.confirm(`删除 ${tool.name}？该工具授权将被清理，历史调用保留。`)) return;
    try {
      await api(`/api/admin/services/${service.id}/tools/${tool.id}`, { method: "DELETE" });
      if (trial?.id === tool.id) setTrial(null);
      await onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <div className="tool-panel">
      <div className="subsection-heading">
        <div>
          <h2>工具目录</h2>
          <p>仅已确认的定义进入目录；普通角色需要精确工具授权。</p>
        </div>
        {service.kind === "rest" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setEditing({
                text: JSON.stringify(
                  { name: "request", description: "", method: "GET", path: "/", parameters: [], example: {} },
                  null,
                  2,
                ),
              });
            }}
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>定义 REST 工具</span>
          </button>
        )}
      </div>

      {tools.length > 0 ? (
        <div className="tool-list">
          {tools.map((tool) => (
            <div className="tool-card" key={tool.id}>
              <div className="tool-card-head">
                <div>
                  <strong>{tool.name}</strong>
                  {tool.description && <p className="tool-card-desc">{tool.description}</p>}
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`试调用 ${tool.name}`}
                    onClick={() => {
                      setTrial(tool);
                      setArgs(JSON.stringify(tool.example ?? {}, null, 2));
                      setResult(null);
                      setError("");
                    }}
                  >
                    <Play size={13} strokeWidth={1.5} />
                    <span>试调用</span>
                  </button>
                  {tool.rest && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-label={`编辑 ${tool.name}`}
                      onClick={() =>
                        setEditing({
                          id: tool.id,
                          text: JSON.stringify(
                            { ...tool.rest, name: tool.originalName, description: tool.description, example: tool.example },
                            null,
                            2,
                          ),
                        })
                      }
                    >
                      <Pencil size={13} strokeWidth={1.5} />
                      <span>编辑</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-danger-text"
                    aria-label={`删除 ${tool.name}`}
                    onClick={() => void remove(tool)}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                    <span>删除</span>
                  </button>
                </div>
              </div>
              <details className="tool-details">
                <summary>参数 Schema</summary>
                <pre className="json-view">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">尚无已确认工具。MCP 服务请主动同步；REST 服务可手工定义或导入。</p>
      )}

      {editing && (
        <div className="form-stack editor-panel" style={{ marginTop: 20 }}>
          <h3>{editing.id ? "编辑 REST 定义" : "定义 REST 工具"}</h3>
          <p className="muted">
            填写 HTTP 方法、相对路径、parameters、JSON bodySchema 与可选 example；示例仅用于试调用。
          </p>
          <label>
            REST 工具定义
            <textarea
              aria-label="REST 工具定义"
              className="json-editor tall-editor"
              value={editing.text}
              onChange={(event) => setEditing({ ...editing, text: event.target.value })}
              spellCheck={false}
            />
          </label>
          <div className="button-row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
              保存工具
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
              取消编辑
            </button>
          </div>
        </div>
      )}

      {trial && (
        <div className="form-stack editor-panel" style={{ marginTop: 20 }}>
          <h3>试调用 {trial.name}</h3>
          <p className="muted">
            管理员测试不进入正式调用审计。可编辑示例参数，正式调用不会自动填入示例。
          </p>
          <label>
            试调用参数
            <textarea
              aria-label="试调用参数"
              className="json-editor"
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="button-row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void execute()}>
              {busy ? "执行中…" : "执行试调用"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setTrial(null)}>
              关闭试调用
            </button>
          </div>
          {result !== null && (
            <pre data-testid="tool-result" className="json-view">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
