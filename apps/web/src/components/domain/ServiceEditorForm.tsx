import { useId, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { connectionKindLabels, type Service } from "../../types";
import { Button, Field, Input, Select, Switch } from "../ui";
import { HeadersEditor } from "./HeadersEditor";

export interface ServiceEditorFormProps {
  initial?: Service;
  connectionKind?: Service["kind"];
  formId?: string;
  hideActions?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaved: (service: Service) => void;
  onCancel: () => void;
}

function suggestNamespace(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const TIMEOUT_PRESETS = [15, 30, 60, 120];

/** Service registration/edit form with live namespace preview, string timeoutInput, and KV/JSON headers. */
export function ServiceEditorForm({
  initial,
  connectionKind = "mcp",
  formId = "service-editor-form",
  hideActions = false,
  onBusyChange,
  onSaved,
  onCancel,
}: ServiceEditorFormProps) {
  const kind = initial?.kind ?? connectionKind;
  const [name, setName] = useState(initial?.name ?? "");
  const [namespace, setNamespace] = useState(initial?.namespace ?? "");
  const [namespaceEdited, setNamespaceEdited] = useState(Boolean(initial));
  const [url, setUrl] = useState(initial?.url ?? "");
  const [transport, setTransport] = useState<Service["transport"]>(initial?.transport ?? "http");
  const [headers, setHeaders] = useState<Record<string, string>>(initial?.headers ?? {});
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [timeoutInput, setTimeoutInput] = useState(String(initial?.timeoutSeconds ?? 60));
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<Array<{ oldName: string; newName: string }> | null>(null);

  const nameId = useId();
  const nsId = useId();
  const kindId = useId();
  const transportId = useId();
  const urlId = useId();
  const timeoutId = useId();
  const descId = useId();
  const enabledId = useId();

  const effectiveNamespace = (namespace.trim() || suggestNamespace(name) || "service").trim();

  const updateBusy = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };

  const resetImpact = () => {
    if (impact) setImpact(null);
    if (error) setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (headersError) {
      setError(headersError);
      return;
    }
    const parsedTimeout = Number(timeoutInput.trim());
    if (!timeoutInput.trim() || !Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
      setError("调用超时必须为大于 0 的数字（支持小数秒）");
      return;
    }

    updateBusy(true);
    setError("");
    try {
      const body = {
        name,
        namespace: namespace.trim() || undefined,
        kind,
        url,
        transport,
        headers,
        timeoutSeconds: parsedTimeout,
        enabled,
        description,
      };
      if (initial && impact === null) {
        const preview = await api<{ renamedTools: Array<{ oldName: string; newName: string }> }>(
          `/api/admin/services/${initial.id}/config-preview`,
          { method: "POST", body: JSON.stringify(body) },
        );
        if (preview.renamedTools.length) {
          setImpact(preview.renamedTools);
          return;
        }
      }
      const result = await api<{ service: Service }>(
        initial ? `/api/admin/services/${initial.id}` : "/api/admin/services",
        { method: initial ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      onSaved(result.service);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      updateBusy(false);
    }
  };

  const connectionWillReset =
    Boolean(initial) &&
    kind === "mcp" &&
    (initial?.url !== url ||
      initial?.transport !== transport ||
      JSON.stringify(initial?.headers ?? {}) !== JSON.stringify(headers) ||
      initial?.timeoutSeconds !== Number(timeoutInput.trim()) ||
      initial?.enabled !== enabled);

  return (
    <form id={formId} className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-4">
          <Field label="服务名称" htmlFor={nameId} required>
            <Input
              id={nameId}
              value={name}
              placeholder={kind === "mcp" ? "例如：GitHub MCP" : "例如：订单系统 API"}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!namespaceEdited) {
                  setNamespace(suggestNamespace(nextName));
                }
                resetImpact();
              }}
              required
            />
          </Field>

          <Field
            label="命名空间"
            htmlFor={nsId}
            hint={`工具公开前缀预览：${effectiveNamespace}__<tool>`}
          >
            <Input
              id={nsId}
              mono
              value={namespace}
              placeholder="默认根据名称自动生成"
              pattern="[A-Za-z0-9_.-]+"
              maxLength={64}
              onChange={(event) => {
                setNamespace(event.target.value);
                setNamespaceEdited(true);
                resetImpact();
              }}
            />
          </Field>
        </div>

        <Field label="服务说明" htmlFor={descId}>
          <Input
            id={descId}
            value={description}
            placeholder="简述该服务提供的能力范围或环境信息"
            onChange={(event) => {
              setDescription(event.target.value);
              resetImpact();
            }}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 pt-4 border-t border-[#E2E5EC]">
        <div className="grid grid-cols-2 max-[1024px]:grid-cols-1 gap-4">
          <Field label="接入方式" htmlFor={kindId}>
            <Input id={kindId} value={connectionKindLabels[kind]} readOnly disabled />
          </Field>

          {kind === "mcp" ? (
            <Field label="下游传输" htmlFor={transportId}>
              <Select
                id={transportId}
                value={transport}
                onValueChange={(next) => {
                  setTransport(next as Service["transport"]);
                  resetImpact();
                }}
                options={[
                  { value: "http", label: "Streamable HTTP" },
                  { value: "sse", label: "旧 SSE" },
                ]}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        <Field label="服务地址" htmlFor={urlId} required>
          <Input
            id={urlId}
            mono
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              resetImpact();
            }}
            required
            placeholder={kind === "mcp" ? "https://service.example/mcp" : "https://api.example/v1"}
          />
        </Field>

        <Field
          label="调用超时（秒）"
          htmlFor={timeoutId}
          required
          hint="支持正整数或小数秒；未收到下游响应时超时中止，不会自动重发调用。"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={timeoutId}
              mono
              inputMode="decimal"
              value={timeoutInput}
              onChange={(event) => {
                setTimeoutInput(event.target.value);
                resetImpact();
              }}
              className="w-36"
              required
            />
            <div className="flex items-center gap-1.5" role="group" aria-label="快捷超时预设">
              {TIMEOUT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={timeoutInput.trim() === String(preset) ? "primary" : "secondary"}
                  onClick={() => {
                    setTimeoutInput(String(preset));
                    resetImpact();
                  }}
                >
                  {preset}s
                </Button>
              ))}
            </div>
          </div>
        </Field>
      </section>

      <section className="flex flex-col gap-2 pt-4 border-t border-[#E2E5EC]">
        <HeadersEditor
          value={headers}
          onChange={(next) => {
            setHeaders(next);
            resetImpact();
          }}
          onErrorChange={setHeadersError}
        />
        <p className="text-[12px] text-[#5B6270] leading-relaxed">
          固定请求头由网关在出站请求时独立注入，调用方传参无法覆盖。
          {kind === "rest"
            ? " REST 配置有效且启用后即可调用，保存后可定义或导入工具。"
            : " 保存后请在服务详情中主动同步并确认工具目录。"}
        </p>
      </section>

      {impact && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[#FDE68A] bg-[#FFFBEB] p-4 flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#B45309]">
            <AlertTriangle size={16} strokeWidth={1.75} />
            <span>命名空间变更将重命名 {impact.length} 个公开工具</span>
          </div>
          <div className="max-h-[220px] overflow-y-auto rounded-[var(--radius-sm)] bg-white/80 border border-[#FDE68A] p-2.5 flex flex-col gap-1 font-mono text-[12px] text-[#111827]">
            {impact.map((item) => (
              <div key={item.oldName} className="break-all">
                {item.oldName} → {item.newName}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#92400E] leading-relaxed">
            保存后旧名称立即失效（不保留别名），内部 ID、角色授权及历史审计统计保留。
            {connectionWillReset ? " 同时检测到连接参数变更，保存后将重置现有下游连接。" : ""}
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E5EC]">
        <div className="flex items-center gap-2.5">
          <Switch
            id={enabledId}
            checked={enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              resetImpact();
            }}
          />
          <label htmlFor={enabledId} className="text-[13px] font-medium text-[#111827] cursor-pointer">
            启用服务
          </label>
        </div>

        {!hideActions && (
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {impact ? "确认保存" : "保存服务"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
