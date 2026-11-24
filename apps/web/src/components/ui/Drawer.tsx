import { useId, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";

export type DrawerSize = "sm" | "md" | "lg" | "xl";

const RIGHT_SIZE_CLASSES: Record<DrawerSize, string> = {
  sm: "w-full max-w-[420px]",
  md: "w-full max-w-[640px]",
  lg: "w-full max-w-[760px]",
  xl: "w-full max-w-[min(92vw,920px)]",
};

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: "right" | "left";
  size?: DrawerSize;
  busy?: boolean;
  preventClose?: boolean;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Accessible slide-in drawer supporting left mobile navigation and right detail/import workflows. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  size = "lg",
  busy = false,
  preventClose = false,
  headerExtra,
  footer,
  children,
  className,
}: DrawerProps) {
  const descId = useId();
  const isLeft = side === "left";
  const locked = busy || preventClose;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (locked && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-[2px] ach-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={description ? descId : undefined}
          onEscapeKeyDown={(event) => {
            if (locked) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (locked) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (locked) event.preventDefault();
          }}
          className={cn(
            "fixed inset-y-0 z-40 flex flex-col bg-white border-[#E2E5EC] shadow-[var(--shadow-lg)] outline-none",
            isLeft
              ? "left-0 w-[264px] border-r ach-drawer-left-in"
              : cn("right-0 border-l ach-drawer-right-in", RIGHT_SIZE_CLASSES[size]),
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-6 max-[640px]:px-4 py-4 border-b border-[#E2E5EC] bg-white shrink-0">
            <div className="min-w-0 flex-1">
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
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
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

          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 max-[640px]:px-4 py-5">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-2.5 px-6 max-[640px]:px-4 py-3.5 border-t border-[#E2E5EC] bg-[#F5F6F8]/70 shrink-0">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
