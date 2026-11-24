import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Play, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "../lib/api";
import { extractParamRows } from "../lib/schemaForm";
import type { RegisteredTool, Service } from "../types";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  SegmentedControl,
  Skeleton,
  cn,
} from "./ui";
import { RestToolModal } from "./domain/RestToolModal";
import { ToolTestModal } from "./domain/ToolTestModal";

interface ToolPanelProps {
  service: Service;
  tools: RegisteredTool[];
  loading?: boolean;
  onChanged: () => Promise<void>;
  onModalOpenChange?: (open: boolean) => void;
}

const METHOD_TONE: Record<string, "info" | "ok" | "warn" | "err" | "neutral"> = {
  GET: "info",
  POST: "ok",
  PUT: "warn",
  PATCH: "warn",
  DELETE: "err",
};

/** Tool catalog inside ServiceDrawer with non-wrapping row actions, collapsible schemas, and secondary modals. */
export function ToolPanel({
  service,
  tools,
  loading = false,
  onChanged,
  onModalOpenChange,
}: ToolPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [expandedSchema, setExpandedSchema] = useState<Record<string, boolean>>({});
  const [schemaTab, setSchemaTab] = useState<Record<string, "table" | "json">>({});

  const [testTool, setTestTool] = useState<RegisteredTool | null>(null);
  const [restModal, setRestModal] = useState<{ open: boolean; initial: RegisteredTool | null }>({
    open: false,
    initial: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<RegisteredTool | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const anyModalOpen = Boolean(testTool) || restModal.open || Boolean(deleteTarget);
  useEffect(() => {
    onModalOpenChange?.(anyModalOpen);
    return () => onModalOpenChange?.(false);
  }, [anyModalOpen, onModalOpenChange]);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        (tool.description ?? "").toLowerCase().includes(q) ||
        (tool.rest?.path ?? "").toLowerCase().includes(q),
    );
  }, [tools, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyDelete(true);
    try {
      await api(`/api/admin/services/${service.id}/tools/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(`已删除工具 ${deleteTarget.name}`);
      if (testTool?.id === deleteTarget.id) setTestTool(null);
      setDeleteTarget(null);
      await onChanged();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#111827]">
            工具目录（{tools.length}）
          </h3>
          <p className="text-[12px] text-[#4B5563] mt-0.5">
            仅已确认的工具进入目录；普通角色需在「角色与授权」精确授予工具权限。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tools.length > 0 && (
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="搜索工具名或路径…"
              className="w-56"
            />
          )}
          {service.kind === "rest" && (
            <Button
              variant="primary"
              onClick={() => setRestModal({ open: true, initial: null })}
            >
              <Plus size={14} strokeWidth={1.75} />
              <span>定义 REST 工具</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : tools.length === 0 ? (
        <EmptyState
          icon={<Wrench size={20} strokeWidth={1.75} />}
          title="尚无已确认工具"
          description={
            service.kind === "mcp"
              ? "请点击上方「同步工具」从下游 MCP 服务发现并确认工具。"
              : "点击「定义 REST 工具」手工添加，或点击「导入工具」从 OpenAPI / cURL 导入。"
          }
        />
      ) : filteredTools.length === 0 ? (
        <EmptyState title="未找到匹配的工具" description="尝试清空或更换搜索关键字。" />
      ) : (
        <div className="flex flex-col divide-y divide-[#E2E5EC] rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white">
          {filteredTools.map((tool) => {
            const paramRows = extractParamRows(tool.inputSchema);
            const requiredCount = paramRows.filter((row) => row.required).length;
            const descExpanded = Boolean(expandedDesc[tool.id]);
            const schemaExpanded = Boolean(expandedSchema[tool.id]);
            const activeTab = schemaTab[tool.id] ?? (paramRows.length > 0 ? "table" : "json");
            const desc = tool.description ?? "";
            const isLongDesc = desc.length > 100 || desc.includes("\n");

            return (
              <div key={tool.id} className="p-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <strong className="font-mono text-[13px] font-semibold text-[#111827] break-all">
                        {tool.name}
                      </strong>
                      {tool.rest && (
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Badge tone={METHOD_TONE[tool.rest.method] ?? "neutral"} mono>
                            {tool.rest.method}
                          </Badge>
                          <code className="font-mono text-[12px] text-[#4B5563] break-all">
                            {tool.rest.path}
                          </code>
                        </span>
                      )}
                    </div>

                    {desc && (
                      <div className="mt-1">
                        <p
                          className={cn(
                            "text-[13px] text-[#4B5563] leading-relaxed break-words",
                            !descExpanded && "line-clamp-2",
                          )}
                        >
                          {desc}
                        </p>
                        {isLongDesc && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDesc((prev) => ({ ...prev, [tool.id]: !descExpanded }))
                            }
                            className="mt-0.5 text-[12px] text-[#2563EB] hover:underline cursor-pointer"
                          >
                            {descExpanded ? "收起" : "展开"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center flex-nowrap gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`试调用 ${tool.name}`}
                      onClick={() => setTestTool(tool)}
                    >
                      <Play size={13} strokeWidth={1.75} />
                      <span>试调用</span>
                    </Button>
                    {tool.rest && (
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`编辑 ${tool.name}`}
                        onClick={() => setRestModal({ open: true, initial: tool })}
                      >
                        <Pencil size={13} strokeWidth={1.75} />
                        <span>编辑</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`删除 ${tool.name}`}
                      className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                      onClick={() => setDeleteTarget(tool)}
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                      <span>删除</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSchema((prev) => ({ ...prev, [tool.id]: !schemaExpanded }))
                    }
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5B6270] hover:text-[#111827] cursor-pointer"
                  >
                    {schemaExpanded ? (
                      <ChevronDown size={14} strokeWidth={1.75} />
                    ) : (
                      <ChevronRight size={14} strokeWidth={1.75} />
                    )}
                    <span className="tabular-nums">
                      参数 Schema（{paramRows.length} 个参数 · {requiredCount} 个必填）
                    </span>
                  </button>

                  {schemaExpanded && (
                    <div className="mt-2.5 flex flex-col gap-2.5 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/70 p-3">
                      <div className="flex items-center justify-between">
                        <SegmentedControl
                          aria-label={`${tool.name} 参数视图`}
                          value={activeTab}
                          onValueChange={(next) =>
                            setSchemaTab((prev) => ({ ...prev, [tool.id]: next }))
                          }
                          options={[
                            { value: "table", label: "结构化参数表" },
                            { value: "json", label: "原始 JSON Schema" },
                          ]}
                        />
                      </div>

                      {activeTab === "table" ? (
                        paramRows.length === 0 ? (
                          <p className="text-[12px] text-[#5B6270] py-1">无入参定义</p>
                        ) : (
                          <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-white">
                            <table className="w-full text-left border-collapse text-[12px]">
                              <thead className="bg-[#EEF0F4] text-[#4B5563]">
                                <tr>
                                  <th className="px-3 py-1.5 font-medium">分组</th>
                                  <th className="px-3 py-1.5 font-medium">名称</th>
                                  <th className="px-3 py-1.5 font-medium">类型</th>
                                  <th className="px-3 py-1.5 font-medium">必填</th>
                                  <th className="px-3 py-1.5 font-medium">说明</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5EC]">
                                {paramRows.map((row) => (
                                  <tr key={`${row.group}-${row.name}`}>
                                    <td className="px-3 py-1.5 font-mono text-[#5B6270]">{row.group}</td>
                                    <td className="px-3 py-1.5 font-mono font-medium text-[#111827]">
                                      {row.name}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-[#4B5563]">{row.type}</td>
                                    <td className="px-3 py-1.5">
                                      {row.required ? (
                                        <Badge tone="warn">必填</Badge>
                                      ) : (
                                        <span className="text-[#5B6270]">可选</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#4B5563]">{row.description || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        <pre className="m-0 max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-white p-3 font-mono text-[12px] text-[#111827]">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToolTestModal
        open={Boolean(testTool)}
        serviceId={service.id}
        tool={testTool}
        onClose={() => setTestTool(null)}
      />

      <RestToolModal
        open={restModal.open}
        serviceId={service.id}
        initial={restModal.initial}
        onClose={() => setRestModal({ open: false, initial: null })}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        tone="danger"
        title="删除工具"
        description="删除后该工具将立即从网关目录移除，需要重新同步或定义才能恢复。"
        entity={deleteTarget?.name}
        consequences={[
          "清理所有角色对该工具的授权记录",
          "保留历史正式调用审计记录与用户累计统计",
        ]}
        confirmLabel="确认删除"
        busy={busyDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
