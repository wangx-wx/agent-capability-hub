import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "../lib/clipboard";
import { Button, IconButton, Modal } from "./ui";

interface SecretDialogProps {
  open?: boolean;
  kind: "password" | "api-key";
  title: string;
  value: string;
  onClose: () => void;
}

/** Modal displaying generated passwords (one-time warning) or reusable API keys. */
export function SecretDialog({ open = true, kind, title, value, onClose }: SecretDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [value, open]);

  const copy = async () => {
    const ok = await copyText(value);
    if (!ok) {
      toast.error("复制失败，请手动选中复制");
      return;
    }
    setCopied(true);
    toast.success(kind === "password" ? "密码已复制到剪贴板" : "API Key 已复制到剪贴板");
  };

  const isPassword = kind === "password";

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      size="sm"
      preventBackdropClose={isPassword}
      footer={
        <Button variant="primary" onClick={onClose}>
          {copied && <Check size={14} strokeWidth={1.75} />}
          <span>{copied ? "已复制，完成" : "完成"}</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {isPassword ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-[13px] leading-relaxed"
          >
            <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
            <span>
              该密码仅在本次创建或重置时明文展示一次，关闭弹窗后无法再次查看，请立即复制并通过安全渠道交付。
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-[#4B5563] leading-relaxed">
            凭证已保存在本地 SQLite 实例中，之后仍可随时查看和复制。请妥善保管并仅在受信客户端中使用。
          </p>
        )}

        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]">
          <code className="flex-1 min-w-0 font-mono text-[13px] text-[#111827] break-all">
            {value}
          </code>
          <IconButton
            size="sm"
            variant="secondary"
            aria-label="复制凭证"
            title="复制"
            onClick={() => void copy()}
          >
            {copied ? (
              <Check size={14} strokeWidth={1.75} className="text-[#15803D]" />
            ) : (
              <Copy size={14} strokeWidth={1.75} />
            )}
          </IconButton>
        </div>
      </div>
    </Modal>
  );
}
