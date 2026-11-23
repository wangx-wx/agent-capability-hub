import { useState } from "react";
import { ArrowLeft, Braces, Plug } from "lucide-react";
import { connectionKindLabels, type Service } from "../types";
import { ServiceEditor } from "./ServiceEditor";
import { RestImportForm } from "./RestImportForm";

export function ServiceOnboarding({ onSaved, onCancel }: {
  onSaved: (services: Service[], imported: boolean) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<Service["kind"] | null>(null);
  const [method, setMethod] = useState<"manual" | "openapi" | "curl">("manual");

  return (
    <div>
      <div className="subsection-heading">
        <div>
          <h2>选择接入方式</h2>
          <p className="muted">接入后统一作为 MCP 工具提供给 Agent。</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          <ArrowLeft size={14} strokeWidth={1.5} />
          返回服务列表
        </button>
      </div>

      <div className="connection-options" role="group" aria-label="接入方式">
        {(["mcp", "rest"] as const).map((value) => {
          const Icon = value === "mcp" ? Plug : Braces;
          return (
            <button
              key={value}
              type="button"
              className={`connection-option ${kind === value ? "selected" : ""}`}
              aria-label={connectionKindLabels[value]}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              <Icon size={20} strokeWidth={1.5} />
              <strong>{connectionKindLabels[value]}</strong>
              <span>{value === "mcp" ? "连接已有 MCP 服务，发现并同步工具。" : "将 HTTP API 映射为 MCP 工具。"}</span>
            </button>
          );
        })}
      </div>

      {kind === "rest" && (
        <div className="button-row connection-methods" role="group" aria-label="REST 接入方式">
          {(["manual", "openapi", "curl"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`btn ${method === value ? "btn-primary" : "btn-secondary"}`}
              aria-pressed={method === value}
              onClick={() => setMethod(value)}
            >
              {{ manual: "手工定义", openapi: "OpenAPI", curl: "cURL" }[value]}
            </button>
          ))}
        </div>
      )}

      {kind && (kind === "mcp" || method === "manual") && (
        <ServiceEditor
          key={kind}
          connectionKind={kind}
          onSaved={(service) => onSaved([service], false)}
          onCancel={onCancel}
        />
      )}
      {kind === "rest" && method !== "manual" && (
        <RestImportForm key={method} format={method} onSaved={(services) => onSaved(services, true)} />
      )}
    </div>
  );
}
