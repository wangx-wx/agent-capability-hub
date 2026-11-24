import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "ok" | "warn" | "err" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  warn: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
  err: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  info: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  neutral: "bg-[#EEF0F4] text-[#4B5563] border-[#E2E5EC]",
};

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  mono?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

/** Pill status badge supporting optional status dot and breathing pulse. */
export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  mono = false,
  title,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 min-h-[22px] px-2.5 py-0.5 rounded-full border text-[12px] font-medium leading-none whitespace-nowrap",
        mono && "font-mono text-[11px] tabular-nums",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full bg-current shrink-0", pulse && "ach-pulse")}
        />
      )}
      {children}
    </span>
  );
}

/** Compact neutral tag pill for role chips and parameter metadata. */
export function Tag({
  mono = false,
  className,
  children,
}: {
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-2 rounded-[var(--radius-xs)] bg-[#EEF0F4] text-[#4B5563] text-[12px] font-medium whitespace-nowrap",
        mono && "font-mono text-[11px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Empty state container with icon, title, description, and optional primary CTA. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2.5 px-6 py-12 rounded-[var(--radius-md)] bg-white border border-dashed border-[#CBD2DF]",
        className,
      )}
    >
      {icon && (
        <div className="inline-grid place-items-center h-10 w-10 rounded-full bg-[#EEF0F4] text-[#4B5563]">
          {icon}
        </div>
      )}
      <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      {description && <p className="text-[13px] text-[#4B5563] max-w-md">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Loading placeholder skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-[var(--radius-sm)] bg-[#E6E9EF]", className)}
    />
  );
}
