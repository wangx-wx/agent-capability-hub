import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select } from "../ui";

export interface AuditQuery {
  range: "24h" | "7d" | "30d" | "all" | "custom";
  from: string;
  to: string;
  username: string;
  serviceName: string;
  toolName: string;
  clientName: string;
}

export const DEFAULT_AUDIT_QUERY: AuditQuery = {
  range: "7d", from: "", to: "", username: "", serviceName: "", toolName: "", clientName: "",
};

export function auditQueryParams(query: AuditQuery) {
  const params = new URLSearchParams();
  if (query.range === "custom") {
    params.set("from", query.from);
    params.set("to", query.to);
  } else if (query.range !== "all") {
    const hours = query.range === "24h" ? 24 : query.range === "7d" ? 168 : 720;
    const now = Date.now();
    params.set("from", new Date(now - hours * 3_600_000).toISOString());
    params.set("to", new Date(now).toISOString());
  }
  for (const field of ["username", "serviceName", "toolName", "clientName"] as const) {
    if (query[field].trim()) params.set(field, query[field].trim());
  }
  return params;
}

export function AuditQueryForm({ onApply, busy }: { onApply: (query: AuditQuery, reset?: boolean) => void; busy: boolean }) {
  const [draft, setDraft] = useState(DEFAULT_AUDIT_QUERY);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = { ...draft };
    if (draft.range === "custom") {
      const from = Date.parse(draft.from);
      const to = Date.parse(draft.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        setError("请填写有效的开始和结束时间");
        return;
      }
      if (from >= to) { setError("结束时间必须晚于开始时间"); return; }
      query.from = new Date(from).toISOString();
      query.to = new Date(to).toISOString();
    }
    setError("");
    onApply(query);
  };

  return (
    <form aria-label="审计查询条件" onSubmit={submit} className="mb-4 rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-[14px] font-semibold text-[#111827]">查询条件</h2>
        <span className="text-[12px] text-[#5B6270]">多项条件同时匹配</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="时间范围" htmlFor="audit-range">
          <Select id="audit-range" aria-label="时间范围" value={draft.range}
            onValueChange={(range) => { setDraft((current) => ({ ...current, range })); setError(""); }}
            options={[
              { value: "24h", label: "最近 24 小时" }, { value: "7d", label: "最近 7 天" },
              { value: "30d", label: "最近 30 天" }, { value: "all", label: "全部时间" }, { value: "custom", label: "自定义范围" },
            ]} />
        </Field>
        {draft.range === "custom" && <>
          <Field label="开始时间" htmlFor="audit-from" className="min-w-0 flex-1 basis-52">
            <Input id="audit-from" type="datetime-local" step="1" value={draft.from}
              onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} />
          </Field>
          <Field label="结束时间（不含）" htmlFor="audit-to" className="min-w-0 flex-1 basis-52">
            <Input id="audit-to" type="datetime-local" step="1" value={draft.to}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} />
          </Field>
        </>}
      </div>
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[1100px]:grid-cols-4 gap-3 mt-3">
        {([
          ["username", "用户账号"], ["serviceName", "服务名称"], ["toolName", "工具名称"], ["clientName", "客户端名称"],
        ] as const).map(([field, label]) => (
          <Field key={field} label={label} htmlFor={`audit-${field}`}>
            <Input id={`audit-${field}`} value={draft[field]} placeholder={`输入${label}片段`}
              onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />
          </Field>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-[12px] text-[#B91C1C]">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-[12px] text-[#5B6270]">时间输入使用本地时间；查询后同步更新统计、趋势和明细。</p>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => {
            setDraft(DEFAULT_AUDIT_QUERY); setError(""); onApply(DEFAULT_AUDIT_QUERY, true);
          }}>重置</Button>
          <Button type="submit" variant="primary" disabled={busy}>查询</Button>
        </div>
      </div>
    </form>
  );
}
