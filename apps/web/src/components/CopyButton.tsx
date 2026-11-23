import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  ariaLabel?: string;
}

export function CopyButton({ value, label = "复制", ariaLabel = "复制" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      className="btn btn-secondary"
      aria-label={ariaLabel}
      onClick={() => void handleCopy()}
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
      <span>{copied ? "已复制" : label}</span>
    </button>
  );
}
