import { useEffect, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "../../lib/api";
import { Button, Field, Modal, PasswordInput } from "../ui";

export interface PasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Account password change modal accessed from the topbar account menu. */
export function PasswordModal({ open, onOpenChange, onSuccess }: PasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setBusy(false);
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      setError("请输入当前密码与新密码");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api<void>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      onOpenChange(false);
      toast.success("密码已更新，请重新登录");
      onSuccess();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="修改密码"
      description="修改成功后当前账号的所有网页会话都会退出，需要重新登录。"
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="change-password-form" variant="primary" loading={busy}>
            更新密码
          </Button>
        </>
      }
    >
      <form id="change-password-form" className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field label="当前密码" htmlFor={currentId} required>
          <PasswordInput
            id={currentId}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>

        <Field label="新密码" htmlFor={nextId} required>
          <PasswordInput
            id={nextId}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>

        <Field label="确认新密码" htmlFor={confirmId} required error={error || undefined}>
          <PasswordInput
            id={confirmId}
            autoComplete="new-password"
            invalid={Boolean(error)}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
