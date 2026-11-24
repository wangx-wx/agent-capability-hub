import { useEffect, useId, useState } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "../../lib/api";
import { parseJsonObject, parseJsonValue } from "../../lib/json";
import type { RegisteredTool, RestParameter } from "../../types";
import {
  Button,
  Field,
  IconButton,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
} from "../ui";

export interface RestToolModalProps {
  open: boolean;
  serviceId: string;
  initial: RegisteredTool | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const PARAM_TYPES = ["string", "number", "integer", "boolean"] as const;

interface ParamDraft {
  id: string;
  in: "path" | "query" | "header";
  name: string;
  type: "string" | "number" | "integer" | "boolean";
  required: boolean;
  extra?: RestParameter;
}

let pSeq = 0;
const nextParamId = () => `rp-${++pSeq}`;

function isSimpleScalarParam(param: RestParameter): param is RestParameter & {
  schema: { type: "string" | "number" | "integer" | "boolean" };
} {
  const schema = param.schema;
  if (!schema || typeof schema !== "object") return false;
  const keys = Object.keys(schema);
  const t = schema.type;
  return (
    (t === "string" || t === "number" || t === "integer" || t === "boolean") &&
    keys.every((k) => k === "type" || k === "description") &&
    !param.style &&
    param.explode === undefined
  );
}

function toolToDefaultJson(initial: RegisteredTool | null): Record<string, unknown> {
  if (!initial?.rest) {
    return {
      name: "request",
      description: "",
      method: "GET",
      path: "/",
      parameters: [],
      example: {},
    };
  }
  return {
    ...initial.rest,
    name: initial.originalName,
    description: initial.description ?? "",
    ...(initial.example !== undefined ? { example: initial.example } : {}),
  };
}

/** 680px modal for creating or editing a REST tool with lossless JSON fallback for advanced schemas. */
export function RestToolModal({ open, serviceId, initial, onClose, onSaved }: RestToolModalProps) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [complexLocked, setComplexLocked] = useState(false);

  const [name, setName] = useState("request");
  const [method, setMethod] = useState<string>("GET");
  const [path, setPath] = useState("/");
  const [description, setDescription] = useState("");
  const [params, setParams] = useState<ParamDraft[]>([]);
  const [bodySchemaText, setBodySchemaText] = useState("");
  const [bodyRequired, setBodyRequired] = useState(false);
  const [bodyContentType, setBodyContentType] = useState("application/json");
  const [exampleText, setExampleText] = useState("{}");
  const [preservedSchemaDefs, setPreservedSchemaDefs] = useState<Record<string, unknown> | undefined>();

  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nameId = useId();
  const methodId = useId();
  const pathId = useId();
  const descId = useId();

  const applyDefinitionToForm = (def: Record<string, unknown>): boolean => {
    const rawParams = Array.isArray(def.parameters) ? (def.parameters as RestParameter[]) : [];
    const hasDefs = Boolean(def.schemaDefs && typeof def.schemaDefs === "object");
    const hasComplexParams = rawParams.some((p) => !isSimpleScalarParam(p));

    setName(typeof def.name === "string" ? def.name : "");
    setMethod(typeof def.method === "string" ? def.method.toUpperCase() : "GET");
    setPath(typeof def.path === "string" ? def.path : "/");
    setDescription(typeof def.description === "string" ? def.description : "");
    setPreservedSchemaDefs(hasDefs ? (def.schemaDefs as Record<string, unknown>) : undefined);
    setBodyRequired(Boolean(def.bodyRequired));
    setBodyContentType(
      typeof def.bodyContentType === "string" ? def.bodyContentType : "application/json",
    );
    setBodySchemaText(def.bodySchema !== undefined ? JSON.stringify(def.bodySchema, null, 2) : "");
    setExampleText(def.example !== undefined ? JSON.stringify(def.example, null, 2) : "{}");

    setParams(
      rawParams.map((p) => ({
        id: nextParamId(),
        in: p.in,
        name: p.name,
        type:
          typeof p.schema?.type === "string" &&
          PARAM_TYPES.includes(p.schema.type as (typeof PARAM_TYPES)[number])
            ? (p.schema.type as (typeof PARAM_TYPES)[number])
            : "string",
        required: Boolean(p.required),
        extra: p,
      })),
    );

    const locked = hasDefs || hasComplexParams;
    setComplexLocked(locked);
    return locked;
  };

  useEffect(() => {
    if (!open) return;
    const def = toolToDefaultJson(initial);
    setJsonText(JSON.stringify(def, null, 2));
    const locked = applyDefinitionToForm(def);
    setMode(locked ? "json" : "form");
    setError("");
  }, [open, initial]);

  const buildPayloadFromForm = (): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } => {
    const parameters: RestParameter[] = params.map((row) =>
      row.extra && !isSimpleScalarParam(row.extra)
        ? { ...row.extra, in: row.in, name: row.name, required: row.required }
        : { in: row.in, name: row.name, schema: { type: row.type }, required: row.required },
    );

    let bodySchema: unknown;
    if (bodySchemaText.trim() && method !== "GET" && method !== "HEAD") {
      const parsedBody = parseJsonValue(bodySchemaText, "Body Schema");
      if (!parsedBody.ok) return parsedBody;
      bodySchema = parsedBody.value;
    }

    let example: unknown;
    if (exampleText.trim()) {
      const parsedExample = parseJsonObject(exampleText, "试调用示例");
      if (!parsedExample.ok) return parsedExample;
      example = parsedExample.value;
    }

    return {
      ok: true,
      value: {
        name,
        description,
        method,
        path,
        parameters,
        ...(bodySchema !== undefined
          ? {
              bodySchema,
              bodyRequired,
              ...(bodyContentType.trim() ? { bodyContentType: bodyContentType.trim() } : {}),
            }
          : {}),
        ...(preservedSchemaDefs ? { schemaDefs: preservedSchemaDefs } : {}),
        ...(example !== undefined ? { example } : {}),
      },
    };
  };

  const switchMode = (nextMode: "form" | "json") => {
    if (nextMode === mode) return;
    setError("");
    if (nextMode === "json") {
      const built = buildPayloadFromForm();
      if (!built.ok) {
        setError(built.error);
        return;
      }
      setJsonText(JSON.stringify(built.value, null, 2));
      setMode("json");
      return;
    }

    const parsed = parseJsonObject(jsonText, "REST 工具定义");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const locked = applyDefinitionToForm(parsed.value);
    if (locked) {
      setError("包含 schemaDefs 或高级参数序列化规则，已锁定使用 JSON 视图以保留完整约束。");
      return;
    }
    setMode("form");
  };

  const save = async () => {
    setError("");
    let payload: Record<string, unknown>;
    if (mode === "json") {
      const parsed = parseJsonObject(jsonText, "REST 工具定义");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      payload = parsed.value;
    } else {
      const built = buildPayloadFromForm();
      if (!built.ok) {
        setError(built.error);
        return;
      }
      payload = built.value;
    }

    setBusy(true);
    try {
      await api(`/api/admin/services/${serviceId}/tools${initial ? `/${initial.id}` : ""}`, {
        method: initial ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(initial ? "REST 工具已更新" : "REST 工具已创建");
      onClose();
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={initial ? `编辑 REST 定义：${initial.originalName}` : "定义 REST 工具"}
      description="配置 HTTP 方法、相对路径模板、请求参数与 JSON Body Schema；示例仅用于试调用。"
      size="md"
      className="max-w-[680px]"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>
            保存工具
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            aria-label="REST 工具编辑模式"
            value={mode}
            onValueChange={switchMode}
            options={[
              ...(!complexLocked ? [{ value: "form" as const, label: "基础表单" }] : []),
              { value: "json" as const, label: "JSON 定义" },
            ]}
          />
          {complexLocked && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#1D4ED8]">
              <Info size={14} strokeWidth={1.75} />
              <span>含高级 Schema 约束，已锁定 JSON 模式防丢失</span>
            </span>
          )}
        </div>

        {mode === "form" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 max-[768px]:grid-cols-1 gap-3">
              <Field label="工具名称" htmlFor={nameId} required>
                <Input
                  id={nameId}
                  mono
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="get-user"
                />
              </Field>
              <Field label="HTTP 方法" htmlFor={methodId}>
                <Select
                  id={methodId}
                  value={method}
                  onValueChange={setMethod}
                  options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
                />
              </Field>
              <Field label="相对路径" htmlFor={pathId} required>
                <Input
                  id={pathId}
                  mono
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/users/{id}"
                />
              </Field>
            </div>

            <Field label="工具说明" htmlFor={descId}>
              <Input
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简述该接口用途"
              />
            </Field>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#111827]">
                  请求参数（path / query / header）
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setParams((prev) => [
                      ...prev,
                      { id: nextParamId(), in: "query", name: "", type: "string", required: false },
                    ])
                  }
                >
                  <Plus size={14} strokeWidth={1.75} />
                  <span>添加参数</span>
                </Button>
              </div>
              {params.length > 0 && (
                <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/60 p-2.5">
                  {params.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <Select
                        aria-label="参数位置"
                        value={row.in}
                        onValueChange={(next) =>
                          setParams((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, in: next as ParamDraft["in"] } : item,
                            ),
                          )
                        }
                        options={[
                          { value: "path", label: "path" },
                          { value: "query", label: "query" },
                          { value: "header", label: "header" },
                        ]}
                      />
                      <Input
                        mono
                        placeholder="参数名"
                        value={row.name}
                        onChange={(e) =>
                          setParams((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                        className="flex-1 min-w-[120px]"
                      />
                      <Select
                        aria-label="参数类型"
                        value={row.type}
                        onValueChange={(next) =>
                          setParams((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, type: next as ParamDraft["type"] }
                                : item,
                            ),
                          )
                        }
                        options={PARAM_TYPES.map((t) => ({ value: t, label: t }))}
                      />
                      <label className="inline-flex items-center gap-1.5 text-[12px] text-[#4B5563] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.required || row.in === "path"}
                          disabled={row.in === "path"}
                          onChange={(e) =>
                            setParams((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, required: e.target.checked } : item,
                              ),
                            )
                          }
                          className="h-3.5 w-3.5 accent-[#18181B]"
                        />
                        <span>必填</span>
                      </label>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="删除参数"
                        onClick={() => setParams((prev) => prev.filter((item) => item.id !== row.id))}
                        className="text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {method !== "GET" && method !== "HEAD" && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[#E2E5EC]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#111827]">
                    JSON 请求体 Schema（可选）
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch checked={bodyRequired} onCheckedChange={setBodyRequired} aria-label="Body 必填" />
                    <span className="text-[12px] text-[#4B5563]">Body 必填</span>
                  </div>
                </div>
                <Input
                  mono
                  value={bodyContentType}
                  onChange={(e) => setBodyContentType(e.target.value)}
                  placeholder="application/json"
                />
                <Textarea
                  mono
                  className="min-h-[100px]"
                  value={bodySchemaText}
                  onChange={(e) => setBodySchemaText(e.target.value)}
                  placeholder='例如 {"type":"object","properties":{"active":{"type":"boolean"}}}'
                  spellCheck={false}
                />
              </div>
            )}

            <Field label="试调用示例（JSON，可选）">
              <Textarea
                mono
                className="min-h-[84px]"
                value={exampleText}
                onChange={(e) => setExampleText(e.target.value)}
                spellCheck={false}
              />
            </Field>
          </div>
        ) : (
          <Field label="REST 工具定义">
            <Textarea
              aria-label="REST 工具定义"
              mono
              className="min-h-[320px]"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
          </Field>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#B91C1C]"
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
