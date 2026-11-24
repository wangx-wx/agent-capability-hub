import type { ReactNode } from "react";
import { cn } from "../ui";

export interface FilterToolbarProps {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}

/** 36px baseline-aligned filter and summary toolbar with responsive wrapping. */
export function FilterToolbar({ left, right, className }: FilterToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 mb-4", className)}>
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">{left}</div>
      {right && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{right}</div>}
    </div>
  );
}
