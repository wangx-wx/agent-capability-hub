import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#18181B] text-white border border-[#18181B] hover:bg-[#27272A] hover:border-[#27272A] shadow-[var(--shadow-xs)]",
  secondary:
    "bg-white text-[#111827] border border-[#CBD2DF] hover:bg-[#EEF0F4] hover:border-[#9CA3AF] shadow-[var(--shadow-xs)]",
  ghost:
    "bg-transparent text-[#4B5563] border border-transparent hover:bg-[#EEF0F4] hover:text-[#111827]",
  danger:
    "bg-[#DC2626] text-white border border-[#DC2626] hover:bg-[#B91C1C] hover:border-[#B91C1C] shadow-[var(--shadow-xs)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[30px] px-2.5 text-[12px] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-[var(--radius-sm)]",
  lg: "h-10 px-4 text-[14px] gap-2 rounded-[var(--radius-sm)]",
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[30px] w-[30px] rounded-[var(--radius-sm)]",
  md: "h-9 w-9 rounded-[var(--radius-sm)]",
  lg: "h-10 w-10 rounded-[var(--radius-sm)]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

/** Standard console button with fixed 30/36/40px scale and built-in loading state. */
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none cursor-pointer",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
        "active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={size === "sm" ? 14 : 16} strokeWidth={1.75} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  "aria-label": string;
  children: ReactNode;
}

/** Square icon-only button matching the 30/36/40px vertical grid. */
export function IconButton({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-grid place-items-center shrink-0 select-none cursor-pointer",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
        "active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        ICON_SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={size === "sm" ? 14 : 16} strokeWidth={1.75} className="animate-spin" /> : children}
    </button>
  );
}
