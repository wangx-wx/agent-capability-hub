import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff, Search, X } from "lucide-react";
import { cn } from "./cn";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Accessible form field wrapper preserving exact accessible label matching via aria-hidden required indicator. */
export function Field({ label, htmlFor, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-[#111827] flex items-center gap-1">
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className="text-[#DC2626]">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-[#B91C1C] leading-snug" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-[#5B6270] leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-[var(--radius-sm)] border bg-white text-[#111827] placeholder:text-[#5B6270] " +
  "transition-[border-color,box-shadow,background-color] duration-150 " +
  "focus:outline-none focus:border-[#2563EB] disabled:bg-[#EEF0F4] disabled:text-[#5B6270] disabled:cursor-not-allowed";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  controlSize?: "md" | "lg";
  invalid?: boolean;
  mono?: boolean;
}

/** Standard 36px/40px text input. */
export function Input({ controlSize = "md", invalid, mono, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        INPUT_BASE,
        controlSize === "lg" ? "h-10 px-3.5 text-[14px]" : "h-9 px-3 text-[13px]",
        invalid ? "border-[#DC2626] focus:border-[#DC2626]" : "border-[#CBD2DF]",
        mono && "font-mono",
        className,
      )}
      {...props}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

/** Multi-line textarea supporting monospace JSON editing. */
export function Textarea({ invalid, mono, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        INPUT_BASE,
        "min-h-[120px] p-3 text-[13px] leading-relaxed resize-y",
        invalid ? "border-[#DC2626] focus:border-[#DC2626]" : "border-[#CBD2DF]",
        mono && "font-mono text-[12px]",
        className,
      )}
      {...props}
    />
  );
}

export interface PasswordInputProps extends Omit<InputProps, "type"> {}

/** Password input with built-in visibility toggle button. */
export function PasswordInput({ controlSize = "md", className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative flex items-center">
      <Input
        {...props}
        controlSize={controlSize}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        className="absolute right-1.5 inline-grid place-items-center h-7 w-7 rounded text-[#5B6270] hover:text-[#111827] hover:bg-[#EEF0F4] transition-colors"
      >
        {visible ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
}

/** 36px search input with leading search icon and one-click clear button. */
export function SearchInput({
  value,
  onValueChange,
  onClear,
  placeholder = "搜索…",
  className,
  id,
  ...props
}: SearchInputProps) {
  const fallbackId = useId();
  return (
    <div className={cn("relative flex items-center min-w-[220px]", className)}>
      <Search
        size={15}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-[#5B6270]"
      />
      <Input
        id={id ?? fallbackId}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="清空搜索"
          onClick={() => {
            onValueChange("");
            onClear?.();
          }}
          className="absolute right-1.5 inline-grid place-items-center h-6 w-6 rounded text-[#5B6270] hover:text-[#111827] hover:bg-[#EEF0F4] transition-colors"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
