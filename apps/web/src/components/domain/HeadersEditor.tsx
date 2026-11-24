import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { parseJsonObject } from "../../lib/json";
import { Button, IconButton, Input, SegmentedControl, Textarea } from "../ui";

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  revealed: boolean;
}

export interface HeadersEditorProps {
  label?: string;
  value: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
  onErrorChange?: (error: string | null) => void;
  jsonAriaLabel?: string;
}

let rowSeq = 0;
const nextRowId = () => `hdr-${++rowSeq}`;

function toRows(headers: Record<string, string>): HeaderRow[] {
  return Object.entries(headers).map(([key, value]) => ({
    id: nextRowId(),
    key,
    value,
    revealed: false,
  }));
}

function rowsToObject(rows: HeaderRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) {
      result[key] = row.value;
    }
  }
  return result;
}

/** Dual-mode (Key-Value + JSON) static headers editor with per-row secret masking and auth templates. */
export function HeadersEditor({
  label = "凭证／固定请求头",
  value,
  onChange,
  onErrorChange,
  jsonAriaLabel,
}: HeadersEditorProps) {
  const [mode, setMode] = useState<"kv" | "json">("kv");
  const [rows, setRows] = useState<HeaderRow[]>(() => toRows(value));
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const lastEmittedRef = useRef<string>(JSON.stringify(value));

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      setRows(toRows(value));
      setJsonText(JSON.stringify(value, null, 2));
      setJsonError(null);
      onErrorChange?.(null);
    }
  }, [value, onErrorChange]);

  const emit = (next: Record<string, string>) => {
    lastEmittedRef.current = JSON.stringify(next);
    onChange(next);
  };

  const updateRows = (nextRows: HeaderRow[]) => {
    setRows(nextRows);
    const obj = rowsToObject(nextRows);
    setJsonText(JSON.stringify(obj, null, 2));
    setJsonError(null);
    onErrorChange?.(null);
    emit(obj);
  };

  const applyTemplate = (headerKey: string, initialValue: string) => {
    const existingIndex = rows.findIndex(
      (row) => row.key.trim().toLowerCase() === headerKey.toLowerCase(),
    );
    if (existingIndex >= 0) {
      updateRows(
        rows.map((row, idx) =>
          idx === existingIndex ? { ...row, key: headerKey, value: initialValue, revealed: true } : row,
        ),
      );
    } else {
      updateRows([...rows, { id: nextRowId(), key: headerKey, value: initialValue, revealed: true }]);
    }
  };

  const handleModeChange = (nextMode: "kv" | "json") => {
    if (nextMode === "kv" && jsonError) {
      return;
    }
    if (nextMode === "json") {
      setJsonText(JSON.stringify(rowsToObject(rows), null, 2));
    }
    setMode(nextMode);
  };

  const handleJsonChange = (nextText: string) => {
    setJsonText(nextText);
    const parsed = parseJsonObject(nextText, label);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      onErrorChange?.(parsed.error);
      return;
    }
    const entries = Object.entries(parsed.value);
    if (entries.some(([, entryVal]) => typeof entryVal !== "string")) {
      const msg = `${label}的每个字段值必须均为字符串`;
      setJsonError(msg);
      onErrorChange?.(msg);
      return;
    }
    const clean = Object.fromEntries(entries) as Record<string, string>;
    setJsonError(null);
    onErrorChange?.(null);
    setRows(toRows(clean));
    emit(clean);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[#111827]">{label}</span>
        <SegmentedControl
          aria-label={`${label}编辑模式`}
          value={mode}
          onValueChange={handleModeChange}
          options={[
            { value: "kv", label: "键值编辑" },
            { value: "json", label: "JSON" },
          ]}
        />
      </div>

      {mode === "kv" ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/60 p-3">
          {rows.length === 0 ? (
            <p className="text-[12px] text-[#5B6270] py-1">
              未配置固定请求头。可添加自定义头部或直接选用下方鉴权模板。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <Input
                    mono
                    placeholder="Header 名称，如 Authorization"
                    value={row.key}
                    onChange={(e) =>
                      updateRows(rows.map((item) => (item.id === row.id ? { ...item, key: e.target.value } : item)))
                    }
                    className="flex-1 min-w-[140px]"
                  />
                  <div className="relative flex-1 min-w-[180px] flex items-center">
                    <Input
                      mono
                      type={row.revealed ? "text" : "password"}
                      placeholder="Header 值"
                      value={row.value}
                      onChange={(e) =>
                        updateRows(
                          rows.map((item) => (item.id === row.id ? { ...item, value: e.target.value } : item)),
                        )
                      }
                      className="pr-9"
                    />
                    <button
                      type="button"
                      aria-label={row.revealed ? "隐藏请求头值" : "显示请求头值"}
                      onClick={() =>
                        setRows(
                          rows.map((item) =>
                            item.id === row.id ? { ...item, revealed: !item.revealed } : item,
                          ),
                        )
                      }
                      className="absolute right-1.5 inline-grid place-items-center h-7 w-7 rounded text-[#5B6270] hover:text-[#111827] hover:bg-[#EEF0F4] cursor-pointer"
                    >
                      {row.revealed ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
                    </button>
                  </div>
                  <IconButton
                    size="md"
                    variant="ghost"
                    aria-label="删除请求头"
                    onClick={() => updateRows(rows.filter((item) => item.id !== row.id))}
                    className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => updateRows([...rows, { id: nextRowId(), key: "", value: "", revealed: true }])}
            >
              <Plus size={14} strokeWidth={1.75} />
              <span>添加请求头</span>
            </Button>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#5B6270]">快速填充：</span>
              <Button size="sm" variant="ghost" onClick={() => applyTemplate("Authorization", "Bearer ")}>
                Bearer Token
              </Button>
              <Button size="sm" variant="ghost" onClick={() => applyTemplate("X-Api-Key", "")}>
                X-Api-Key
              </Button>
              <Button size="sm" variant="ghost" onClick={() => applyTemplate("Authorization", "Basic ")}>
                Basic Auth
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Textarea
            mono
            aria-label={jsonAriaLabel ?? `${label}（JSON）`}
            invalid={Boolean(jsonError)}
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
          />
          {jsonError && (
            <p className="text-[12px] text-[#B91C1C]" role="alert">
              {jsonError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
