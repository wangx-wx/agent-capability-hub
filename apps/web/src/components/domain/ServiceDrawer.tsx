import { useState } from "react";
import { FileInput, Pencil, Plug, RefreshCw, Trash2 } from "lucide-react";
import { connectionKindLabels, type RegisteredTool, type Service } from "../../types";
import { Badge, Button, CopyButton, Drawer, Switch } from "../ui";
import { ToolPanel } from "../ToolPanel";
import { serviceStatusMeta } from "./ServiceCard";

export interface ServiceDrawerProps {
  service: Service | null;
  tools: RegisteredTool[];
  loadingTools: boolean;
  busyAction: "sync" | "connect" | "toggle" | null;
  externalModalOpen?: boolean;
  onClose: () => void;
  onToggleEnabled: (service: Service, nextEnabled: boolean) => void;
  onEdit: (service: Service) => void;
  onTestConnection: (service: Service) => void;
  onSyncTools: (service: Service) => void;
  onImportTools: (service: Service) => void;
  onRequestDelete: (service: Service) => void;
  onToolsChanged: () => Promise<void>;
}

/** 760px right drawer displaying service metadata, quick actions, and its ToolPanel catalog. */
export function ServiceDrawer({
  service,
  tools,
  loadingTools,
  busyAction,
  externalModalOpen = false,
  onClose,
  onToggleEnabled,
  onEdit,
  onTestConnection,
  onSyncTools,
  onImportTools,
  onRequestDelete,
  onToolsChanged,
}: ServiceDrawerProps) {
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const status = service ? serviceStatusMeta(service) : null;
  const headerCount = service ? Object.keys(service.headers ?? {}).length : 0;

  return (
    <Drawer
      open={Boolean(service)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      preventClose={externalModalOpen || toolModalOpen}
      busy={busyAction === "sync" || busyAction === "connect"}
      title={service?.name ?? "服务详情"}
      description={service?.description || undefined}
      headerExtra={
        service &&
        status && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Switch
              checked={service.enabled}
              disabled={busyAction === "toggle"}
              aria-label="启用或停用当前服务"
              onCheckedChange={(checked) => onToggleEnabled(service, checked)}
            />
          </div>
        )
      }
    >
      {service && (
        <div className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-[#F5F6F8]/70 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={service.kind === "mcp" ? "info" : "neutral"}>
                {connectionKindLabels[service.kind]}
              </Badge>
              <Badge tone="neutral" mono>
                {service.namespace}
              </Badge>
              {service.kind === "mcp" && (
                <Badge tone="neutral" mono>
                  {service.transport === "sse" ? "旧 SSE" : "Streamable HTTP"}
                </Badge>
              )}
              <Badge tone="neutral" mono>
                超时 {service.timeoutSeconds}s
              </Badge>
              <Badge tone="neutral" mono>
                请求头 {headerCount} 项
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-white border border-[#E2E5EC] px-3 py-2">
              <code className="font-mono text-[12px] text-[#111827] break-all">{service.url}</code>
              <CopyButton size="sm" iconOnly value={service.url} ariaLabel="复制服务地址" />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {service.kind === "mcp" && (
                <>
                  <Button
                    variant="primary"
                    loading={busyAction === "sync"}
                    disabled={busyAction !== null}
                    onClick={() => onSyncTools(service)}
                  >
                    <RefreshCw size={14} strokeWidth={1.75} />
                    <span>同步工具</span>
                  </Button>
                  <Button
                    variant="secondary"
                    loading={busyAction === "connect"}
                    disabled={busyAction !== null}
                    onClick={() => onTestConnection(service)}
                  >
                    <Plug size={14} strokeWidth={1.75} />
                    <span>测试连接</span>
                  </Button>
                </>
              )}

              {service.kind === "rest" && (
                <Button variant="primary" onClick={() => onImportTools(service)}>
                  <FileInput size={14} strokeWidth={1.75} />
                  <span>导入工具</span>
                </Button>
              )}

              <Button variant="secondary" onClick={() => onEdit(service)}>
                <Pencil size={14} strokeWidth={1.75} />
                <span>编辑服务</span>
              </Button>

              <Button
                variant="ghost"
                className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C] ml-auto"
                onClick={() => onRequestDelete(service)}
              >
                <Trash2 size={14} strokeWidth={1.75} />
                <span>删除服务</span>
              </Button>
            </div>
          </div>

          <ToolPanel
            key={service.id}
            service={service}
            tools={tools}
            loading={loadingTools}
            onChanged={onToolsChanged}
            onModalOpenChange={setToolModalOpen}
          />
        </div>
      )}
    </Drawer>
  );
}
