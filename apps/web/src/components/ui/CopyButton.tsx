import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "../../lib/clipboard";
import { Button, IconButton, type ButtonSize, type ButtonVariant } from "./Button";

export interface CopyButtonProps {
  value: string;
  label?: string;
  ariaLabel?: string;
  successMessage?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  iconOnly?: boolean;
  className?: string;
}

/** Copy action button with non-HTTPS clipboard fallback and toast feedback. */
export function CopyButton({
  value,
  label = "复制",
  ariaLabel = "复制",
  successMessage = "已复制到剪贴板",
  size = "md",
  variant = "secondary",
  iconOnly = false,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copyText(value);
    if (!ok) {
      toast.error("复制失败，请手动选中文本复制");
      return;
    }
    setCopied(true);
    toast.success(successMessage);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1800);
  };

  if (iconOnly) {
    return (
      <IconButton
        size={size}
        variant={variant}
        aria-label={ariaLabel}
        title={label}
        className={className}
        onClick={(event) => {
          event.stopPropagation();
          void handleCopy();
        }}
      >
        {copied ? <Check size={14} strokeWidth={1.75} className="text-[#15803D]" /> : <Copy size={14} strokeWidth={1.75} />}
      </IconButton>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      aria-label={ariaLabel}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        void handleCopy();
      }}
    >
      {copied ? <Check size={14} strokeWidth={1.75} className="text-[#15803D]" /> : <Copy size={14} strokeWidth={1.75} />}
      <span>{copied ? "已复制" : label}</span>
    </Button>
  );
}
