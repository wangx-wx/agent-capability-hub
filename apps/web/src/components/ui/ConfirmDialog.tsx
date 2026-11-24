import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { cn } from "./cn";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  entity?: string;
  consequences?: string[];
  tone?: "danger" | "warning";
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** Standardized secondary confirmation modal for destructive or high-risk actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  entity,
  consequences,
  tone = "danger",
  confirmLabel = "确认执行",
  cancelLabel = "取消",
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDanger = tone === "danger";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            loading={busy}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {entity && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-sm)] border text-[13px]",
              isDanger
                ? "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]"
                : "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
            )}
          >
            <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0" />
            <span className="font-mono font-medium break-all">{entity}</span>
          </div>
        )}

        {consequences && consequences.length > 0 && (
          <ul className="m-0 pl-5 flex flex-col gap-1.5 text-[13px] text-[#4B5563] list-disc">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
