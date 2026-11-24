import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Info, Play, Sparkles, Wand2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { parseJsonObject } from "../../lib/json";
import {
  argsToFormValues,
  formValuesToArgs,
  inspectToolSchema,
  type FormFieldEntry,
  type SchemaField,
} from "../../lib/schemaForm";
import type { RegisteredTool } from "../../types";
import {
  Badge,
  Button,
  CopyButton,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Textarea,
} from "../ui";

export interface ToolTestModalProps {
  open: boolean;
  serviceId: string;
  tool: RegisteredTool | null;
  onClose: () => void;
}

const UNSET_SELECT = "__ach_unset__";
const NULL_SELECT = "__ach_null__";

function isResultError(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && (result as { isError?: unknown }).isError === true);
}

function formatFriendlyPreview(result: unknown): string {
  if (!result || typeof result !== "object") {
    return JSON.stringify(result, null, 2);
  }
  const record = result as { content?: unknown; structuredContent?: unknown };
  const parts: string[] = [];

  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (!item || typeof item !== "object") continue;
      const block = item as { type?: unknown; text?: unknown; mimeType?: unknown };
      if (block.type === "text" && typeof block.text === "string") {
        const trimmed = block.text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            parts.push(JSON.stringify(JSON.parse(trimmed), null, 2));
            continue;
          } catch {
            // Render raw text when not valid JSON.
          }
        }
        parts.push(block.text);
      } else {
        parts.push(JSON.stringify(block, null, 2));
      }
    }
  }

  if (record.structuredContent !== undefined) {
    parts.push(`--- structuredContent ---\n${JSON.stringify(record.structuredContent, null, 2)}`);
  }

  if (parts.length === 0) {
    return JSON.stringify(result, null, 2);
  }
  return parts.join("\n\n");
}

/** Split-pane modal for invoking a tool with lightweight Schema form or JSON arguments. */
export function ToolTestModal({ open, serviceId, tool, onClose }: ToolTestModalProps) {
  const inspection = useMemo(() => inspectToolSchema(tool?.inputSchema), [tool]);
  const [inputMode, setInputMode] = useState<"form" | "json">("json");
  const [formValues, setFormValues] = useState<Record<string, FormFieldEntry>>({});
  const [jsonText, setJsonText] = useState("{}");
  const [resultMode, setResultMode] = useState<"friendly" | "raw">("friendly");
  const [result, setResult] = useState<unknown>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !tool) return;
    const exampleArgs = tool.example ?? {};
    setJsonText(JSON.stringify(exampleArgs, null, 2));
    setFormValues(argsToFormValues(inspection.fields, exampleArgs));
    setInputMode(inspection.supported && inspection.fields.length > 0 ? "form" : "json");
    setResult(null);
    setElapsedMs(null);
    setError("");
    setResultMode("friendly");
  }, [open, tool, inspection]);

  const switchInputMode = (nextMode: "form" | "json") => {
    if (nextMode === inputMode) return;
    setError("");
    if (nextMode === "json") {
      const built = formValuesToArgs(inspection.fields, formValues);
      if (built.ok) {
        setJsonText(JSON.stringify(built.value, null, 2));
      }
      setInputMode("json");
      return;
    }
    if (!inspection.supported) return;
    const parsed = parseJsonObject(jsonText, "试调用参数");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setFormValues(argsToFormValues(inspection.fields, parsed.value));
    setInputMode("form");
  };

  const formatJson = () => {
    const parsed = parseJsonObject(jsonText, "试调用参数");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError("");
    setJsonText(JSON.stringify(parsed.value, null, 2));
  };

  const fillExample = () => {
    if (!tool) return;
    const exampleArgs = tool.example ?? {};
    setError("");
    setJsonText(JSON.stringify(exampleArgs, null, 2));
    if (inspection.supported) {
      setFormValues(argsToFormValues(inspection.fields, exampleArgs));
    }
  };

  const execute = async () => {
    if (!tool) return;
    setError("");

    let argsPayload: Record<string, unknown>;
    if (inputMode === "form") {
      const built = formValuesToArgs(inspection.fields, formValues);
      if (!built.ok) {
        setError(built.error);
        return;
      }
      argsPayload = built.value;
    } else {
      const parsed = parseJsonObject(jsonText, "试调用参数");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      argsPayload = parsed.value;
    }

    setBusy(true);
    setResult(null);
    setElapsedMs(null);
    const started = performance.now();
    try {
      const response = await api<{ result: unknown }>(
        `/api/admin/services/${serviceId}/tools/${tool.id}/test`,
        {
          method: "POST",
          body: JSON.stringify({ arguments: argsPayload }),
        },
      );
      setElapsedMs(Math.max(0, Math.round(performance.now() - started)));
      setResult(response.result);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !busy) {
      event.preventDefault();
      void execute();
    }
  };

  const groupedFields = useMemo(() => {
    const groups = new Map<string, SchemaField[]>();
    for (const field of inspection.fields) {
      const key = field.group ?? "参数";
      const list = groups.get(key) ?? [];
      list.push(field);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [inspection.fields]);

  const rawJsonString = result !== null ? JSON.stringify(result, null, 2) : "";
  const friendlyString = result !== null ? formatFriendlyPreview(result) : "";
  const hasToolError = result !== null && isResultError(result);

  return (
    <Modal
      open={open && Boolean(tool)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={tool ? `试调用：${tool.name}` : "试调用"}
      description="管理员试调用不进入正式调用审计，也不计入用户调用统计。支持 ⌘/Ctrl + Enter 执行。"
      size="xl"
      busy={busy}
    >
      {tool && (
        <div
          onKeyDown={handleKeyDown}
          className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-5 items-start"
        >
          <div className="flex flex-col gap-3.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                aria-label="参数输入方式"
                value={inputMode}
                onValueChange={switchInputMode}
                options={[
                  ...(inspection.supported ? [{ value: "form" as const, label: "表单填参" }] : []),
                  { value: "json" as const, label: "JSON 参数" },
                ]}
              />

              <div className="flex items-center gap-1.5">
                {inputMode === "json" && (
                  <Button size="sm" variant="ghost" onClick={formatJson}>
                    <Wand2 size={14} strokeWidth={1.75} />
                    <span>格式化</span>
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={fillExample}>
                  <Sparkles size={14} strokeWidth={1.75} />
                  <span>填入示例</span>
                </Button>
              </div>
            </div>

            {!inspection.supported && inspection.reason && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[12px] text-[#1D4ED8]">
                <Info size={15} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                <span>{inspection.reason}</span>
              </div>
            )}

            {inputMode === "form" && inspection.supported ? (
              <div className="flex flex-col gap-4 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/60 p-3.5 max-h-[380px] overflow-y-auto">
                {groupedFields.length === 0 ? (
                  <p className="text-[13px] text-[#5B6270] py-2">该工具无需传入参数，可直接执行。</p>
                ) : (
                  groupedFields.map(([groupName, fields]) => (
                    <div key={groupName} className="flex flex-col gap-3">
                      {groupedFields.length > 1 && (
                        <div className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[#5B6270] border-b border-[#E2E5EC] pb-1">
                          {groupName}
                        </div>
                      )}
                      {fields.map((field) => {
                        const entry = formValues[field.key] ?? { mode: "unset" };
                        return (
                          <SchemaFieldInput
                            key={field.key}
                            field={field}
                            entry={entry}
                            onChange={(next) =>
                              setFormValues((prev) => ({ ...prev, [field.key]: next }))
                            }
                          />
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <Field label="试调用参数" htmlFor="tool-test-json-args">
                <Textarea
                  id="tool-test-json-args"
                  aria-label="试调用参数"
                  mono
                  className="min-h-[280px]"
                  value={jsonText}
                  onChange={(event) => {
                    setJsonText(event.target.value);
                    if (error) setError("");
                  }}
                  spellCheck={false}
                />
              </Field>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="primary" loading={busy} onClick={() => void execute()}>
                {!busy && <Play size={14} strokeWidth={1.75} />}
                <span>{busy ? "执行中…" : "执行试调用"}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0 rounded-[var(--radius-md)] border border-[#E2E5EC] bg-[#F5F6F8]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#111827]">返回结果</span>
                {result !== null && (
                  <Badge tone={hasToolError ? "err" : "ok"}>
                    {hasToolError ? "返回错误 (isError)" : "执行成功"}
                  </Badge>
                )}
                {elapsedMs !== null && (
                  <span className="font-mono text-[12px] text-[#5B6270] tabular-nums">
                    {elapsedMs} ms
                  </span>
                )}
              </div>

              {result !== null && (
                <div className="flex items-center gap-1.5">
                  <SegmentedControl
                    aria-label="结果展示方式"
                    value={resultMode}
                    onValueChange={setResultMode}
                    options={[
                      { value: "friendly", label: "友好预览" },
                      { value: "raw", label: "原始 JSON" },
                    ]}
                  />
                  <CopyButton
                    size="sm"
                    iconOnly
                    value={resultMode === "friendly" ? friendlyString : rawJsonString}
                    ariaLabel="复制调用结果"
                  />
                </div>
              )}
            </div>

            {result === null ? (
              <div className="py-16 text-center text-[13px] text-[#5B6270]">
                {busy ? "正在向目标服务发起调用…" : "填写参数后点击「执行试调用」查看响应结果。"}
              </div>
            ) : (
              <pre
                data-testid="tool-result"
                className="m-0 max-h-[380px] overflow-auto rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-white p-3.5 font-mono text-[12px] leading-relaxed text-[#111827] whitespace-pre-wrap break-all"
              >
                {resultMode === "friendly" ? friendlyString : rawJsonString}
              </pre>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function SchemaFieldInput({
  field,
  entry,
  onChange,
}: {
  field: SchemaField;
  entry: FormFieldEntry;
  onChange: (next: FormFieldEntry) => void;
}) {
  if (field.type === "boolean") {
    const selected =
      entry.mode === "unset"
        ? UNSET_SELECT
        : entry.mode === "null"
          ? NULL_SELECT
          : entry.value
            ? "true"
            : "false";
    return (
      <Field label={field.name} required={field.required} hint={field.description}>
        <Select
          aria-label={field.name}
          value={selected}
          onValueChange={(next) => {
            if (next === UNSET_SELECT) onChange({ mode: "unset" });
            else if (next === NULL_SELECT) onChange({ mode: "null" });
            else onChange({ mode: "value", value: next === "true" });
          }}
          options={[
            ...(!field.required ? [{ value: UNSET_SELECT, label: "不传（省略）" }] : []),
            { value: "true", label: "true" },
            { value: "false", label: "false" },
            ...(field.nullable ? [{ value: NULL_SELECT, label: "null" }] : []),
          ]}
        />
      </Field>
    );
  }

  if (field.type === "enum" && field.enumValues) {
    const selected =
      entry.mode === "unset"
        ? UNSET_SELECT
        : entry.mode === "null"
          ? NULL_SELECT
          : String(entry.value);
    return (
      <Field label={field.name} required={field.required} hint={field.description}>
        <Select
          aria-label={field.name}
          value={selected}
          onValueChange={(next) => {
            if (next === UNSET_SELECT) onChange({ mode: "unset" });
            else if (next === NULL_SELECT) onChange({ mode: "null" });
            else onChange({ mode: "value", value: next });
          }}
          options={[
            ...(!field.required ? [{ value: UNSET_SELECT, label: "不传（省略）" }] : []),
            ...field.enumValues.map((val) => ({ value: String(val), label: String(val) })),
          ]}
        />
      </Field>
    );
  }

  const textValue = entry.mode === "value" ? String(entry.value) : "";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[#111827]">
          {field.name}
          {field.required && (
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">
              *
            </span>
          )}
          <span className="ml-1.5 font-mono text-[11px] font-normal text-[#5B6270]">
            {field.type}
          </span>
        </span>
        {!field.required && field.type === "string" && (
          <button
            type="button"
            onClick={() =>
              onChange(
                entry.mode === "value" && entry.value === ""
                  ? { mode: "unset" }
                  : { mode: "value", value: "" },
              )
            }
            className="text-[11px] text-[#2563EB] hover:underline cursor-pointer"
          >
            {entry.mode === "value" && entry.value === "" ? "改为省略" : entry.mode === "unset" ? "显式传空串 \"\"" : ""}
          </button>
        )}
      </div>
      <Input
        mono={field.type === "number" || field.type === "integer"}
        placeholder={
          entry.mode === "value" && entry.value === ""
            ? '""（空字符串）'
            : field.required
              ? `请输入 ${field.name}`
              : "留空则省略该字段"
        }
        value={textValue}
        onChange={(event) => {
          const val = event.target.value;
          if (!val && !field.required) {
            onChange({ mode: "unset" });
          } else {
            onChange({ mode: "value", value: val });
          }
        }}
      />
      {field.description && <p className="text-[11px] text-[#5B6270]">{field.description}</p>}
    </div>
  );
}
