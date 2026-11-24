import { useEffect, useId, useState, type FormEvent } from "react";
import { api, errorMessage } from "../../lib/api";
import type { ApiKey } from "../../types";
import { Button, Field, Input, Modal, cn } from "../ui";

type ExpiryPreset = "30d" | "90d" | "1y" | "permanent" | "custom";

const PRESET_OPTIONS: Array<{ id: ExpiryPreset; label: string }> = [
  { id: "30d", label: "30 天" },
  { id: "90d", label: "90 天" },
  { id: "1y", label: "1 年" },
  { id: "permanent", label: "永久" },
  { id: "custom", label: "自定义日期" },
];

function formatLocalMinDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function resolveExpiresAt(preset: ExpiryPreset, customDate: string): string | null {
  const now = Date.now();
  if (preset === "permanent") return null;
  if (preset === "30d") return new Date(now + 30 * 86_400_000).toISOString();
  if (preset === "90d") return new Date(now + 90 * 86_400_000).toISOString();
  if (preset === "1y") return new Date(now + 365 * 86_400_000).toISOString();
  return new Date(customDate).toISOString();
}

export interface CreateKeyModalProps {
  open: boolean;
  ownerId: string;
  isManaged: boolean;
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
}

/** Modal for issuing a named API Key with explicit unselected expiry presets per security spec. */
export function CreateKeyModal({
  open,
  ownerId,
  isManaged,
  onClose,
  onCreated,
}: CreateKeyModalProps) {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<ExpiryPreset | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nameId = useId();
  const customId = useId();
  const minDateTime = formatLocalMinDateTime(new Date(Date.now() + 60_000));

  useEffect(() => {
    if (!open) {
      setName("");
      setPreset(null);
      setCustomDate("");
      setError("");
      setBusy(false);
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("请输入 API Key 名称");
      return;
    }
    if (preset === null) {
      setError("请明确选择过期时间或永久有效");
      return;
    }
    if (preset === "custom") {
      const ts = Date.parse(customDate);
      if (!customDate || !Number.isFinite(ts) || ts <= Date.now()) {
        setError("到期时间必须晚于当前时间");
        return;
      }
    }

    setBusy(true);
    setError("");
    const path = isManaged ? `/api/admin/users/${ownerId}/keys` : "/api/keys";
    try {
      const result = await api<{ key: ApiKey }>(path, {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          expiresAt: resolveExpiresAt(preset, customDate),
        }),
      });
      onClose();
      onCreated(result.key);
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
      title="创建 API Key"
      description="API Key 用作 MCP 网关 Bearer 鉴权凭证，遵循所属用户当前的角色授权。"
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="create-key-form" variant="primary" loading={busy}>
            创建 Key
          </Button>
        </>
      }
    >
      <form id="create-key-form" className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field label="名称" htmlFor={nameId} required>
          <Input
            id={nameId}
            autoFocus
            value={name}
            placeholder="例如：本地 Codex / Claude Code"
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-[#111827]">
            有效期
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">
              *
            </span>
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="有效期">
            {PRESET_OPTIONS.map((item) => {
              const active = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPreset(item.id);
                    if (error) setError("");
                  }}
                  className={cn(
                    "h-9 px-3 rounded-[var(--radius-sm)] border text-[13px] font-medium cursor-pointer transition-colors",
                    active
                      ? "border-[#18181B] bg-[#18181B] text-white"
                      : "border-[#CBD2DF] bg-white text-[#111827] hover:bg-[#EEF0F4]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {preset === "custom" && (
          <Field label="到期时间" htmlFor={customId} required>
            <Input
              id={customId}
              mono
              type="datetime-local"
              min={minDateTime}
              value={customDate}
              onChange={(event) => {
                setCustomDate(event.target.value);
                if (error) setError("");
              }}
              required
            />
          </Field>
        )}

        {error && (
          <p className="text-[12px] text-[#B91C1C]" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
