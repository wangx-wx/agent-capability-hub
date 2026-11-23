import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Service } from "../types";

interface Operation {
  id: string;
  label: string;
  supported: boolean;
  reasons: string[];
  definition: Record<string, unknown>;
  change?: string;
}

interface Group {
  id: string;
  url: string;
  name: string;
  namespace: string;
  headers: Record<string, string>;
  operations: Operation[];
  serviceId?: string;
}

interface DraftGroup extends Omit<Group, "headers" | "operations"> {
  headers: string;
  enabled: boolean;
  operations: Array<Operation & { checked: boolean; text: string }>;
}

const changeLabels: Record<string, string> = {
  added: "新增",
  modified: "修改",
  unchanged: "保持",
};

export function RestImportForm({ format: kind, targetService, onSaved }: {
  format: "openapi" | "curl";
  targetService?: Service;
  onSaved: (services: Service[]) => void;
}) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [services, setServices] = useState<Service[]>(targetService ? [targetService] : []);
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    if (!targetService) return {};
    const targetUrl = new URL(targetService.url);
    return {
      [targetService.url]: targetService.id,
      ...(targetUrl.pathname === "/" ? { [targetUrl.origin]: targetService.id } : {}),
    };
  });
  const [previewId, setPreviewId] = useState("");
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<{ services: Service[] }>("/api/admin/services")
      .then((result) => setServices(result.services))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  const clear = () => {
    setPreviewId("");
    setGroups([]);
  };

  const preview = async (targetServices = targets) => {
    setBusy(true);
    setError("");
    try {
      const source = mode === "file" ? { file } : mode === "url" ? { url } : { text };
      const result = await api<{ preview: { id: string; groups: Group[] } }>(
        "/api/admin/imports/preview",
        {
          method: "POST",
          body: JSON.stringify({ kind, ...source, baseUrl: baseUrl || undefined, targetServices }),
        },
      );
      setPreviewId(result.preview.id);
      setGroups(
        result.preview.groups.map((group) => ({
          ...group,
          headers: JSON.stringify(group.headers, null, 2),
          enabled: services.find((service) => service.id === group.serviceId)?.enabled ?? false,
          operations: group.operations.map((operation) => ({
            ...operation,
            checked: false,
            text: JSON.stringify(operation.definition, null, 2),
          })),
        })),
      );
    } catch (reason) {
      clear();
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const changeGroup = (id: string, change: Partial<DraftGroup>) => {
    setGroups((items) => items.map((group) => (group.id === id ? { ...group, ...change } : group)));
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const selected = groups.filter((group) => group.operations.some((operation) => operation.checked));
      const result = await api<{ groups: Array<{ service: Service }> }>(
        "/api/admin/imports/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            previewId,
            groups: selected.map((group) => ({
              groupId: group.id,
              serviceId: group.serviceId,
              name: group.name,
              namespace: group.namespace,
              headers: JSON.parse(group.headers),
              enabled: group.enabled,
              operations: group.operations
                .filter((operation) => operation.checked)
                .map((operation) => ({
                  operationId: operation.id,
                  definition: JSON.parse(operation.text),
                })),
            })),
          }),
        },
      );
      onSaved(result.groups.map((group) => group.service));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const sameTarget = (service: Service, group: DraftGroup) => {
    try {
      return service.kind === "rest" && new URL(service.url).toString() === new URL(group.url).toString();
    } catch {
      return false;
    }
  };

  return (
    <section>
      <div className="subsection-heading">
        <div>
          <h2>{kind === "openapi" ? "OpenAPI 导入" : "cURL 导入"}</h2>
          <p className="section-description">
            先解析并审阅操作定义，再确认保存。无法转换的操作会显示原因，不能选中。
          </p>
        </div>
      </div>

      <div className="form-stack editor-panel">
        <div className="step-header">
          <span className="step-badge">01</span>
          <h2>导入来源</h2>
        </div>

        <div className="form-grid">
          {kind === "openapi" && (
            <label>
              输入方式
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value);
                  clear();
                }}
              >
                <option value="text">粘贴 JSON / YAML</option>
                <option value="file">上传文件</option>
                <option value="url">文档 URL</option>
              </select>
            </label>
          )}
        </div>

        {mode === "text" && (
          <label>
            导入原文
            <textarea
              className="json-editor tall-editor"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                clear();
              }}
              spellCheck={false}
            />
          </label>
        )}

        {mode === "url" && (
          <label>
            文档 URL
            <input
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                clear();
              }}
            />
          </label>
        )}

        {mode === "file" && (
          <label>
            OpenAPI 文件
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                clear();
                if (selected) {
                  void selected
                    .text()
                    .then((content) => setFile({ name: selected.name, content }))
                    .catch((reason) => setError(errorMessage(reason)));
                }
              }}
            />
            {file && <span className="muted mono">{file.name}</span>}
          </label>
        )}

        {kind === "openapi" && mode !== "url" && (
          <label>
            相对 server 的基址（可选）
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                clear();
              }}
              placeholder="https://api.example/openapi.yaml"
            />
          </label>
        )}

        <p className="muted">
          cURL 仅解析请求结构，不执行命令或读取本机文件与环境变量。示例仅用于试调用。
        </p>

        <div className="button-row">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void preview()}>
            {busy ? "处理中…" : "解析预览"}
          </button>
        </div>
      </div>

      {groups.map((group, index) => (
        <section className="editor-panel form-stack" key={group.id} aria-label={`目标服务 ${index + 1}`}>
          <div className="step-header">
            <span className="step-badge">{String(index + 2).padStart(2, "0")}</span>
            <h2>
              目标 {index + 1}：{group.url || "地址未解析"}
            </h2>
          </div>

          <label>
            保存方式
            <select
              value={group.serviceId ?? ""}
              disabled={busy}
              onChange={(event) => {
                const choices = { ...targets, [group.url]: event.target.value };
                setTargets(choices);
                void preview(choices);
              }}
            >
              <option value="">新建服务（REST API 接入）</option>
              {services
                .filter((service) => sameTarget(service, group))
                .map((service) => (
                  <option value={service.id} key={service.id}>
                    更新 {service.name}
                  </option>
                ))}
            </select>
          </label>

          <p className="muted">
            更新按 HTTP 方法＋路径模板匹配，保留 ID 和授权；未选中的旧操作不会删除。修改目标地址请先编辑服务配置。
          </p>

          <div className="form-grid">
            <label>
              导入服务名称
              <input
                value={group.name}
                onChange={(event) => changeGroup(group.id, { name: event.target.value })}
              />
            </label>
            <label>
              导入命名空间
              <input
                value={group.namespace}
                onChange={(event) => changeGroup(group.id, { namespace: event.target.value })}
              />
            </label>
          </div>

          <label>
            导入凭证／固定请求头（JSON）
            <textarea
              className="json-editor"
              value={group.headers}
              onChange={(event) => changeGroup(group.id, { headers: event.target.value })}
              spellCheck={false}
            />
          </label>

          <label className="check-option">
            <input
              type="checkbox"
              checked={group.enabled}
              onChange={(event) => changeGroup(group.id, { enabled: event.target.checked })}
            />
            导入后启用
          </label>

          <div className="tool-list">
            {group.operations.map((operation) => (
              <div className="tool-card" key={operation.id}>
                <div className="operation-row">
                  <label className="check-option">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${operation.label}`}
                      checked={operation.checked}
                      disabled={!operation.supported}
                      onChange={(event) =>
                        changeGroup(group.id, {
                          operations: group.operations.map((item) =>
                            item.id === operation.id ? { ...item, checked: event.target.checked } : item,
                          ),
                        })
                      }
                    />
                    <span className="mono">{operation.label}</span>
                  </label>
                  <span className={`badge ${operation.supported ? "badge-ok" : "badge-err"}`}>
                    {operation.supported ? changeLabels[operation.change ?? ""] ?? "可转换" : "不可转换"}
                  </span>
                </div>

                {operation.reasons.map((reason) => (
                  <p className="form-error" key={reason} style={{ marginTop: 6 }}>
                    {reason}
                  </p>
                ))}

                {operation.supported && (
                  <details className="tool-details" open={operation.checked}>
                    <summary>审阅并编辑参数定义和可选示例</summary>
                    <textarea
                      aria-label={`操作定义 ${operation.label}`}
                      className="json-editor tall-editor"
                      style={{ marginTop: 8 }}
                      value={operation.text}
                      onChange={(event) =>
                        changeGroup(group.id, {
                          operations: group.operations.map((item) =>
                            item.id === operation.id ? { ...item, text: event.target.value } : item,
                          ),
                        })
                      }
                      spellCheck={false}
                    />
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {previewId && (
        <div className="button-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !groups.some((group) => group.operations.some((operation) => operation.checked))}
            onClick={() => void confirm()}
          >
            确认导入
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
