import type { ReactNode } from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "./cn";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuSeparator = () => (
  <DropdownPrimitive.Separator className="my-1 h-px bg-[#E2E5EC]" />
);

export function DropdownMenuContent({
  align = "end",
  sideOffset = 6,
  className,
  children,
}: {
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[70] min-w-[176px] rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-1.5 shadow-[var(--shadow-md)]",
          "text-[13px] text-[#111827] outline-none",
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  danger = false,
  disabled = false,
  onSelect,
  className,
  children,
}: {
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] select-none cursor-pointer outline-none",
        danger
          ? "text-[#B91C1C] data-[highlighted]:bg-[#FEF2F2]"
          : "text-[#111827] data-[highlighted]:bg-[#EEF0F4]",
        "data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}
