import { useState } from "react";
import { Braces, Plug } from "lucide-react";
import { connectionKindLabels, type Service } from "../../types";
import { Button, Drawer, cn } from "../ui";
import { RestImportForm } from "../RestImportForm";
import { ServiceEditorForm } from "./ServiceEditorForm";

export interface ServiceOnboardingDrawerProps {
  open: boolean;
  sessionKey: number;
  target?: Service;
  onClose: () => void;
  onSaved: (services: Service[], imported: boolean) => void;
}

/** Wide right drawer (min(92vw, 920px)) hosting unified MCP/REST onboarding and REST re-import. */
export function ServiceOnboardingDrawer({
  open,
  sessionKey,
  target,
  onClose,
  onSaved,
}: ServiceOnboardingDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="xl"
      title={target ? `导入工具：${target.name}` : "接入服务"}
      description={
        target
          ? "与当前服务目标一致时预选更新，其他目标分别保存；确认前请审阅保存方式。"
          : "选择服务接入方式。接入后统一作为 MCP 工具提供给 Agent，保存后接入方式不可修改。"
      }
    >
      {open && (
        <OnboardingFlow
          key={target?.id ?? `new-${sessionKey}`}
          target={target}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Drawer>
  );
}

function OnboardingFlow({
  target,
  onSaved,
  onCancel,
}: {
  target?: Service;
  onSaved: (services: Service[], imported: boolean) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<Service["kind"] | null>(target?.kind ?? null);
  const [method, setMethod] = useState<"manual" | "openapi" | "curl">(target ? "openapi" : "manual");

  return (
    <div className="flex flex-col gap-5">
      {!target && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[14px] font-semibold text-[#111827]">选择接入方式</h3>
          <div className="grid grid-cols-2 max-[768px]:grid-cols-1 gap-3" role="group" aria-label="接入方式">
            {(["mcp", "rest"] as const).map((value) => {
              const Icon = value === "mcp" ? Plug : Braces;
              const selected = kind === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={connectionKindLabels[value]}
                  aria-pressed={selected}
                  onClick={() => setKind(value)}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all",
                    selected
                      ? "border-[#2563EB] bg-[#EFF6FF] shadow-[var(--shadow-xs)]"
                      : "border-[#E2E5EC] bg-white hover:border-[#CBD2DF]",
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className={selected ? "text-[#2563EB]" : "text-[#4B5563]"}
                  />
                  <strong className="text-[14px] font-semibold text-[#111827]">
                    {connectionKindLabels[value]}
                  </strong>
                  <span className="text-[12px] text-[#4B5563]">
                    {value === "mcp"
                      ? "连接已有 Streamable HTTP 或旧版 SSE MCP 服务，发现并同步工具。"
                      : "将 HTTP REST API 映射为 MCP 工具（支持手工定义、OpenAPI 或 cURL 导入）。"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {kind === "rest" && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="REST 接入方式">
          {(["manual", "openapi", "curl"] as const)
            .filter((value) => !target || value !== "manual")
            .map((value) => (
              <Button
                key={value}
                variant={method === value ? "primary" : "secondary"}
                aria-pressed={method === value}
                onClick={() => setMethod(value)}
              >
                {{ manual: "手工定义", openapi: "OpenAPI", curl: "cURL" }[value]}
              </Button>
            ))}
        </div>
      )}

      {kind && (kind === "mcp" || method === "manual") && (
        <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5">
          <ServiceEditorForm
            key={kind}
            connectionKind={kind}
            onSaved={(service) => onSaved([service], false)}
            onCancel={onCancel}
          />
        </div>
      )}

      {kind === "rest" && method !== "manual" && (
        <RestImportForm
          key={method}
          format={method}
          targetService={target}
          onSaved={(services) => onSaved(services, true)}
        />
      )}
    </div>
  );
}
