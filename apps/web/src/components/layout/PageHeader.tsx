import type { ReactNode } from "react";
import { cn } from "../ui";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Unified workspace page header with 22px H1, subtitle, and right-aligned action bar. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 pb-5 mb-5 border-b border-[#E2E5EC]",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em] text-[#111827]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563] max-w-[68ch]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
