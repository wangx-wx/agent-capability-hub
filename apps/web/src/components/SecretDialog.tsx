import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface SecretDialogProps {
  title: string;
  value: string;
  onClose: () => void;
}

export function SecretDialog({ title, value, onClose }: SecretDialogProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="secret-dialog" role="dialog" aria-modal="true" aria-labelledby="secret-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-index">KEY</span>
              <span>请安全保存</span>
            </p>
            <h2 id="secret-title">{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <p className="section-description">
          凭证保存在本地 SQLite 中，可之后再次复制。请通过安全渠道交付给对应使用者。
        </p>
        <div className="secret-value">
          <code>{value}</code>
          <button
            type="button"
            className="icon-button"
            onClick={() => void copy()}
            aria-label="复制凭证"
            title="复制"
          >
            {copied ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />}
          </button>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {copied ? <Check size={15} strokeWidth={1.5} /> : null}
            <span>{copied ? "已复制，完成" : "完成"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
