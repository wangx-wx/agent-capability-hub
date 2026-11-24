import { useState } from "react";
import type { Service } from "../../types";
import { Modal } from "../ui";
import { ServiceEditorForm } from "./ServiceEditorForm";

export interface ServiceEditorModalProps {
  service: Service | null;
  onClose: () => void;
  onSaved: (service: Service) => void;
}

/** Centered 640px modal for editing an existing service configuration. */
export function ServiceEditorModal({ service, onClose, onSaved }: ServiceEditorModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={Boolean(service)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={service ? `编辑服务：${service.name}` : "编辑服务"}
      description="修改名称、命名空间、下游地址、静态请求头与超时配置；接入方式不可修改。"
      size="md"
      busy={busy}
    >
      {service && (
        <ServiceEditorForm
          key={service.id}
          initial={service}
          onBusyChange={setBusy}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
