import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  id?: string;
  value: T;
  onValueChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** 36px Radix Select with Portal dropdown so table/drawer overflow never clips menus. */
export function Select<T extends string = string>({
  id,
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  disabled,
  "aria-label": ariaLabel,
  className,
}: SelectProps<T>) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-2 h-9 px-3 rounded-[var(--radius-sm)]",
          "border border-[#CBD2DF] bg-white text-[13px] text-[#111827] shadow-[var(--shadow-xs)]",
          "hover:border-[#9CA3AF] focus:outline-none focus:border-[#2563EB]",
          "disabled:bg-[#EEF0F4] disabled:text-[#5B6270] disabled:cursor-not-allowed",
          "data-[placeholder]:text-[#5B6270] cursor-pointer whitespace-nowrap",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="text-[#5B6270] shrink-0">
          <ChevronDown size={15} strokeWidth={1.75} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[70] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-hidden",
            "rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-1 shadow-[var(--shadow-md)]",
          )}
        >
          <SelectPrimitive.Viewport className="p-0.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px]",
                  "text-[#111827] select-none cursor-pointer outline-none",
                  "data-[highlighted]:bg-[#EFF6FF] data-[highlighted]:text-[#1D4ED8]",
                  "data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed",
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-[#2563EB] shrink-0">
                  <Check size={14} strokeWidth={2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  "aria-label": string;
  className?: string;
}

/** Strict 36px segmented filter/tab control aligned with SearchInput and Button. */
export function SegmentedControl<T extends string = string>({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center h-9 p-0.5 rounded-[var(--radius-sm)] bg-[#EEF0F4] border border-[#E2E5EC]",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 h-full px-2.5 rounded-[4px] text-[12px] font-medium whitespace-nowrap cursor-pointer",
              "transition-[background-color,color,box-shadow] duration-150",
              active
                ? "bg-white text-[#111827] shadow-[var(--shadow-xs)]"
                : "text-[#4B5563] hover:text-[#111827]",
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "font-mono tabular-nums text-[11px]",
                  active ? "text-[#2563EB]" : "text-[#5B6270]",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
