import { AlertTriangle, RefreshCw } from "lucide-react";
import type { RegisteredTool } from "../../types";
import { Badge, Button, Modal } from "../ui";

export interface SyncPreview {
  id: string;
  added: RegisteredTool[];
  modified: RegisteredTool[];
  deleted: RegisteredTool[];
}

export interface SyncPreviewModalProps {
  open: boolean;
  preview: SyncPreview | null;
  existingTools: RegisteredTool[];
  busy: boolean;
  staleError: boolean;
  error: string;
  onConfirm: () => void;
  onRedetect: () => void;
  onClose: () => void;
}

function stripNoise(tool: RegisteredTool | undefined): string {
  if (!tool) return "{}";
  const { serviceId: _serviceId, id: _id, ...rest } = tool;
  return JSON.stringify(rest, null, 2);
}

/** 760px modal displaying discovered MCP tool changes (+added / ~modified / -deleted) with 409 re-detect recovery. */
export function SyncPreviewModal({
  open,
  preview,
  existingTools,
  busy,
  staleError,
  error,
  onConfirm,
  onRedetect,
  onClose,
}: SyncPreviewModalProps) {
  return (
    <Modal
      open={open && Boolean(preview)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="同步差异"
      description="更新保留工具 ID 与已有角色授权；新增工具默认未授权；确认删除将永久清理对应授权。"
      size="lg"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            取消同步
          </Button>
          {staleError ? (
            <Button variant="primary" loading={busy} onClick={onRedetect}>
              <RefreshCw size={14} strokeWidth={1.75} />
              <span>重新检测差异</span>
            </Button>
          ) : (
            <Button variant="primary" loading={busy} onClick={onConfirm}>
              确认同步
            </Button>
          )}
        </>
      }
    >
      {preview && (
        <div className="flex flex-col gap-5">
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#B91C1C]"
            >
              <span>{error}</span>
              {staleError && (
                <Button size="sm" variant="secondary" loading={busy} onClick={onRedetect}>
                  重新检测差异
                </Button>
              )}
            </div>
          )}

          {preview.deleted.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Badge tone="err">删除（{preview.deleted.length}）</Badge>
                <span className="text-[12px] text-[#B91C1C]">
                  确认后将从目录删除并清理角色授权，以后重现需重新授权。
                </span>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2]/60 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#B91C1C]">
                  <AlertTriangle size={14} strokeWidth={1.75} />
                  <span>即将删除以下工具：</span>
                </div>
                {preview.deleted.map((tool) => (
                  <details
                    key={tool.id ?? tool.name}
                    className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-white px-3 py-2"
                  >
                    <summary className="font-mono text-[12px] font-medium text-[#111827] cursor-pointer">
                      {tool.name}
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-[#F5F6F8] p-2.5 font-mono text-[11px] text-[#4B5563]">
                      {stripNoise(tool)}
                    </pre>
                  </details>
                ))}
              </div>
            </section>
          )}

          {preview.added.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Badge tone="ok">新增（{preview.added.length}）</Badge>
                <span className="text-[12px] text-[#4B5563]">新增工具默认不授予普通角色。</span>
              </div>
              <div className="flex flex-col gap-2">
                {preview.added.map((tool) => (
                  <details
                    key={tool.name}
                    className="rounded-[var(--radius-sm)] border border-[#BBF7D0] bg-[#F0FDF4]/50 px-3 py-2"
                  >
                    <summary className="font-mono text-[12px] font-medium text-[#111827] cursor-pointer">
                      {tool.name}
                    </summary>
                    <pre className="mt-2 max-h-56 overflow-auto rounded bg-white border border-[#E2E5EC] p-2.5 font-mono text-[11px] text-[#111827]">
                      {stripNoise(tool)}
                    </pre>
                  </details>
                ))}
              </div>
            </section>
          )}

          {preview.modified.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Badge tone="warn">更新（{preview.modified.length}）</Badge>
                <span className="text-[12px] text-[#4B5563]">保留现有 ID 与角色授权。</span>
              </div>
              <div className="flex flex-col gap-2">
                {preview.modified.map((tool) => {
                  const previous = existingTools.find((old) => old.id === tool.id);
                  return (
                    <details
                      key={tool.id ?? tool.name}
                      className="rounded-[var(--radius-sm)] border border-[#FDE68A] bg-[#FFFBEB]/50 px-3 py-2"
                    >
                      <summary className="font-mono text-[12px] font-medium text-[#111827] cursor-pointer">
                        {tool.name}
                      </summary>
                      <div className="mt-2 grid grid-cols-2 max-[1024px]:grid-cols-1 gap-2.5">
                        <div>
                          <div className="text-[11px] font-medium text-[#5B6270] mb-1">变更前</div>
                          <pre className="m-0 max-h-56 overflow-auto rounded bg-white border border-[#E2E5EC] p-2.5 font-mono text-[11px] text-[#4B5563]">
                            {stripNoise(previous)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-[#111827] mb-1">变更后</div>
                          <pre className="m-0 max-h-56 overflow-auto rounded bg-white border border-[#E2E5EC] p-2.5 font-mono text-[11px] text-[#111827]">
                            {stripNoise(tool)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
