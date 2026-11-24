import { useId, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[760px]",
  xl: "max-w-[860px]",
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  busy?: boolean;
  preventBackdropClose?: boolean;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Accessible centered dialog with sticky header/footer, focus trap, and Esc guard while busy. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  busy = false,
  preventBackdropClose = false,
  headerExtra,
  footer,
  children,
  className,
}: ModalProps) {
  const descId = useId();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-[2px] ach-fade-in" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <DialogPrimitive.Content
            aria-describedby={description ? descId : undefined}
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (busy || preventBackdropClose) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (busy || preventBackdropClose) event.preventDefault();
            }}
            className={cn(
              "pointer-events-auto relative flex flex-col w-full max-h-[calc(100vh-32px)]",
              "rounded-[var(--radius-lg)] bg-white border border-[#E2E5EC] shadow-[var(--shadow-lg)] ach-modal-in overflow-hidden",
              SIZE_CLASSES[size],
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E5EC] shrink-0">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-[16px] font-semibold text-[#111827] leading-snug break-words">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description
                    id={descId}
                    className="mt-1 text-[13px] text-[#4B5563] leading-relaxed"
                  >
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {headerExtra}
                <DialogPrimitive.Close
                  type="button"
                  disabled={busy}
                  aria-label="关闭"
                  className="inline-grid place-items-center h-8 w-8 rounded-[var(--radius-sm)] text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF0F4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <X size={16} strokeWidth={1.75} />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#E2E5EC] bg-[#F5F6F8]/60 shrink-0">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
