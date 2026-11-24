import { FileInput, MoreHorizontal, Pencil, Plug, RefreshCw, Trash2 } from "lucide-react";
import { connectionKindLabels, connectionLabels, type Service } from "../../types";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Switch,
} from "../ui";

export function serviceStatusMeta(service: Service): {
  tone: "ok" | "warn" | "err" | "neutral";
  label: string;
} {
  if (!service.enabled) {
    return { tone: "neutral", label: "未启用" };
  }
  if (service.kind === "rest") {
    return { tone: "ok", label: "配置有效" };
  }
  if (service.connectionStatus === "connected") {
    return { tone: "ok", label: "已连接" };
  }
  if (service.connectionStatus === "authentication_failed") {
    return { tone: "err", label: "认证失败" };
  }
  return {
    tone: "warn",
    label: connectionLabels[service.connectionStatus] ?? service.connectionStatus,
  };
}

export interface ServiceCardProps {
  service: Service;
  selected: boolean;
  toggling: boolean;
  onOpenDetail: (service: Service) => void;
  onToggleEnabled: (service: Service, nextEnabled: boolean) => void;
  onEdit: (service: Service) => void;
  onTestConnection: (service: Service) => void;
  onSyncTools: (service: Service) => void;
  onImportTools: (service: Service) => void;
  onRequestDelete: (service: Service) => void;
}

/** 4-layer service grid card with kind-aware menu and propagation-safe Switch/actions. */
export function ServiceCard({
  service,
  selected,
  toggling,
  onOpenDetail,
  onToggleEnabled,
  onEdit,
  onTestConnection,
  onSyncTools,
  onImportTools,
  onRequestDelete,
}: ServiceCardProps) {
  const status = serviceStatusMeta(service);
  const toolCount = service.toolCount ?? 0;

  return (
    <article
      onClick={() => onOpenDetail(service)}
      className={[
        "group flex flex-col justify-between gap-3.5 p-5 rounded-[var(--radius-md)] bg-white border cursor-pointer",
        "transition-[box-shadow,border-color] duration-150",
        selected
          ? "border-[#2563EB] shadow-[var(--shadow-md)]"
          : "border-[#E2E5EC] shadow-[var(--shadow-sm)] hover:border-[#CBD2DF] hover:shadow-[var(--shadow-md)]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenDetail(service);
              }}
              className="min-w-0 truncate text-left text-[15px] font-semibold text-[#111827] hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              {service.name}
            </button>
            <Badge tone={service.kind === "mcp" ? "info" : "neutral"} className="shrink-0">
              {connectionKindLabels[service.kind]}
            </Badge>
          </div>
          <div onClick={(event) => event.stopPropagation()} className="shrink-0">
            <Switch
              checked={service.enabled}
              disabled={toggling}
              aria-label={`切换 ${service.name} 启用状态`}
              onCheckedChange={(checked) => onToggleEnabled(service, checked)}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#5B6270] min-w-0">
          <span className="shrink-0 text-[#4B5563]">{service.namespace}</span>
          {service.kind === "mcp" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 uppercase">{service.transport}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="truncate" title={service.url}>
            {service.url}
          </span>
        </div>

        <p className="text-[13px] text-[#4B5563] leading-relaxed line-clamp-2 min-h-[40px]">
          {service.description || "暂无服务说明"}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EEF0F4]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[12px] text-[#4B5563] tabular-nums whitespace-nowrap">
            {toolCount} 工具
          </span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => onOpenDetail(service)}>
            查看工具
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton size="sm" variant="ghost" aria-label={`${service.name} 更多操作`}>
                <MoreHorizontal size={15} strokeWidth={1.75} />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(service)}>
                <Pencil size={14} strokeWidth={1.75} />
                <span>编辑服务</span>
              </DropdownMenuItem>
              {service.kind === "mcp" ? (
                <>
                  <DropdownMenuItem onSelect={() => onTestConnection(service)}>
                    <Plug size={14} strokeWidth={1.75} />
                    <span>测试连接</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSyncTools(service)}>
                    <RefreshCw size={14} strokeWidth={1.75} />
                    <span>同步工具</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={() => onImportTools(service)}>
                  <FileInput size={14} strokeWidth={1.75} />
                  <span>导入工具</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={() => onRequestDelete(service)}>
                <Trash2 size={14} strokeWidth={1.75} />
                <span>删除服务</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
