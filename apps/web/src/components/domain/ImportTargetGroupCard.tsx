import { useId, useState } from "react";
import { ChevronDown, ChevronRight, Code2 } from "lucide-react";
import type { Service } from "../../types";
import { Badge, Button, Field, Input, SearchInput, Select, Switch, Textarea } from "../ui";
import { HeadersEditor } from "./HeadersEditor";

export interface ImportOperation {
  id: string;
  label: string;
  supported: boolean;
  reasons: string[];
  definition: Record<string, unknown>;
  change?: string;
}

export interface DraftOperation extends ImportOperation {
  checked: boolean;
  text: string;
  dirty?: boolean;
}

export interface DraftGroup {
  id: string;
  url: string;
  name: string;
  namespace: string;
  headers: Record<string, string>;
  enabled: boolean;
  serviceId?: string;
  operations: DraftOperation[];
}

const CHANGE_META: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  added: { label: "新增", tone: "ok" },
  modified: { label: "修改", tone: "warn" },
  unchanged: { label: "保持", tone: "neutral" },
};

const NEW_SERVICE_SENTINEL = "__new__";

export interface ImportTargetGroupCardProps {
  group: DraftGroup;
  index: number;
  matchingServices: Service[];
  busy: boolean;
  highlightedOpId?: string | null;
  onSelectTarget: (serviceId: string) => void;
  onChangeGroup: (patch: Partial<DraftGroup>) => void;
  onHeaderErrorChange: (error: string | null) => void;
  onUpdateOperation: (opId: string, patch: Partial<DraftOperation>) => void;
}

/** Single target REST service card within import preview with collapsed operation definitions by default. */
export function ImportTargetGroupCard({
  group,
  index,
  matchingServices,
  busy,
  highlightedOpId,
  onSelectTarget,
  onChangeGroup,
  onHeaderErrorChange,
  onUpdateOperation,
}: ImportTargetGroupCardProps) {
  const [search, setSearch] = useState("");
  const [expandedOps, setExpandedOps] = useState<Record<string, boolean>>({});

  const saveModeId = useId();
  const nameId = useId();
  const nsId = useId();
  const enabledId = useId();

  const toggleExpand = (opId: string) => {
    setExpandedOps((prev) => ({ ...prev, [opId]: !prev[opId] }));
  };

  const convertibleCount = group.operations.filter((op) => op.supported).length;
  const selectedCount = group.operations.filter((op) => op.checked).length;

  const normalizedQuery = search.trim().toLowerCase();
  const visibleOperations = normalizedQuery
    ? group.operations.filter((op) => op.label.toLowerCase().includes(normalizedQuery))
    : group.operations;

  const bulkSelect = (predicate: (op: DraftOperation) => boolean) => {
    onChangeGroup({
      operations: group.operations.map((op) => ({
        ...op,
        checked: op.supported ? predicate(op) : false,
      })),
    });
  };

  return (
    <section
      aria-label={`目标服务 ${index + 1}`}
      className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5 flex flex-col gap-4 shadow-[var(--shadow-xs)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E5EC]">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[#111827] break-all">
            目标 {index + 1}：{group.url || "地址未解析"}
          </h3>
          <p className="text-[12px] text-[#4B5563] mt-0.5">
            更新按 HTTP 方法＋路径模板匹配，保留 ID 和授权；未选中的旧操作不会删除。
          </p>
        </div>
        <Badge tone="neutral" mono>
          {selectedCount} / {convertibleCount} 已选
        </Badge>
      </div>

      <Field label="保存方式" htmlFor={saveModeId}>
        <Select
          id={saveModeId}
          disabled={busy}
          value={group.serviceId || NEW_SERVICE_SENTINEL}
          onValueChange={(next) => onSelectTarget(next === NEW_SERVICE_SENTINEL ? "" : next)}
          options={[
            { value: NEW_SERVICE_SENTINEL, label: "新建服务（REST API 接入）" },
            ...matchingServices.map((service) => ({
              value: service.id,
              label: `更新 ${service.name}`,
            })),
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-4">
        <Field label="导入服务名称" htmlFor={nameId}>
          <Input
            id={nameId}
            value={group.name}
            onChange={(event) => onChangeGroup({ name: event.target.value })}
          />
        </Field>
        <Field label="导入命名空间" htmlFor={nsId}>
          <Input
            id={nsId}
            mono
            value={group.namespace}
            onChange={(event) => onChangeGroup({ namespace: event.target.value })}
          />
        </Field>
      </div>

      <HeadersEditor
        label="导入凭证／固定请求头"
        value={group.headers}
        onChange={(headers) => onChangeGroup({ headers })}
        onErrorChange={onHeaderErrorChange}
        jsonAriaLabel="导入凭证／固定请求头（JSON）"
      />

      <div className="flex items-center gap-2.5">
        <Switch
          id={enabledId}
          checked={group.enabled}
          onCheckedChange={(checked) => onChangeGroup({ enabled: checked })}
        />
        <label htmlFor={enabledId} className="text-[13px] font-medium text-[#111827] cursor-pointer">
          导入后启用
        </label>
      </div>

      <div className="pt-3 border-t border-[#E2E5EC] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="筛选操作路径或方法…"
            className="w-60 max-[768px]:w-full"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => bulkSelect(() => true)}>
              全选可转换
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkSelect((op) => op.change === "added" || op.change === "modified")}
            >
              仅选新增与修改
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkSelect(() => false)}>
              清空
            </Button>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[#E2E5EC] rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/40">
          {visibleOperations.map((operation) => {
            const expanded = Boolean(expandedOps[operation.id]);
            const changeBadge = operation.supported
              ? CHANGE_META[operation.change ?? ""] ?? { label: "可转换", tone: "ok" as const }
              : { label: "不可转换", tone: "err" as const };
            const isHighlighted = highlightedOpId === operation.id;

            return (
              <div
                key={operation.id}
                className={cnPadding(isHighlighted)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${operation.label}`}
                      checked={operation.checked}
                      disabled={!operation.supported}
                      onChange={(event) =>
                        onUpdateOperation(operation.id, { checked: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-[#CBD2DF] accent-[#18181B] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="font-mono text-[13px] font-medium text-[#111827] break-all">
                      {operation.label}
                    </span>
                    {operation.dirty && (
                      <Badge tone="info">已编辑</Badge>
                    )}
                  </label>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={changeBadge.tone}>{changeBadge.label}</Badge>
                    {operation.supported && (
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(operation.id)}>
                        <Code2 size={14} strokeWidth={1.75} />
                        <span>{expanded ? "收起定义" : "编辑定义"}</span>
                        {expanded ? (
                          <ChevronDown size={14} strokeWidth={1.75} />
                        ) : (
                          <ChevronRight size={14} strokeWidth={1.75} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {operation.reasons.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {operation.reasons.map((reason) => (
                      <p key={reason} className="text-[12px] text-[#B91C1C]">
                        {reason}
                      </p>
                    ))}
                  </div>
                )}

                {operation.supported && expanded && (
                  <div className="mt-3">
                    <Textarea
                      mono
                      aria-label={`操作定义 ${operation.label}`}
                      className="min-h-[200px]"
                      value={operation.text}
                      onChange={(event) =>
                        onUpdateOperation(operation.id, { text: event.target.value, dirty: true })
                      }
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {visibleOperations.length === 0 && (
            <p className="py-6 text-center text-[13px] text-[#5B6270]">未找到匹配的操作定义</p>
          )}
        </div>
      </div>
    </section>
  );
}

function cnPadding(highlighted: boolean) {
  return highlighted ? "p-3.5 bg-[#FEF2F2]" : "p-3.5 bg-white";
}
