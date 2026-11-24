import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "../../lib/api";
import type { Role, User } from "../../types";
import { Button, Field, Input, Modal, SearchInput } from "../ui";

function RoleChecklist({
  roles,
  selected,
  onToggle,
}: {
  roles: Role[];
  selected: string[];
  onToggle: (roleId: string, checked: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? roles.filter((role) => role.name.toLowerCase().includes(q)) : roles;
  }, [roles, search]);

  return (
    <div className="flex flex-col gap-2.5">
      {roles.length > 4 && (
        <SearchInput value={search} onValueChange={setSearch} placeholder="筛选角色名称…" />
      )}
      <div className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8]/60 p-2 flex flex-col gap-1">
        {visible.map((role) => {
          const checked = selected.includes(role.id);
          return (
            <label
              key={role.id}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] hover:bg-white cursor-pointer text-[13px] text-[#111827]"
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggle(role.id, event.target.checked)}
                  className="h-4 w-4 accent-[#18181B] cursor-pointer"
                />
                <span className="truncate font-medium">{role.name}</span>
              </span>
              {role.grantCount !== undefined && (
                <span className="font-mono text-[11px] text-[#5B6270] shrink-0">
                  {role.grantCount} 项权限
                </span>
              )}
            </label>
          );
        })}
        {visible.length === 0 && (
          <p className="py-4 text-center text-[12px] text-[#5B6270]">暂无匹配角色</p>
        )}
      </div>
    </div>
  );
}

export function CreateUserModal({
  open,
  roles,
  onClose,
  onCreated,
}: {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onCreated: (user: User, initialPassword: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const usernameId = useId();

  useEffect(() => {
    if (!open) {
      setUsername("");
      setSelectedRoles([]);
      setError("");
      setBusy(false);
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("请输入账号名称");
      return;
    }
    if (selectedRoles.length === 0) {
      setError("请至少为用户分配一个角色");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User; initialPassword: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username: trimmed, roleIds: selectedRoles }),
      });
      onClose();
      onCreated(result.user, result.initialPassword);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="新建用户"
      description="创建本地普通账号并分配至少一个角色；创建成功后将生成一次性随机初始密码。"
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="create-user-form" variant="primary" loading={busy}>
            创建用户
          </Button>
        </>
      }
    >
      <form id="create-user-form" className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field label="账号" htmlFor={usernameId} required>
          <Input
            id={usernameId}
            value={username}
            placeholder="例如：alice"
            autoFocus
            onChange={(event) => {
              setUsername(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#111827]">
            分配角色
            <span aria-hidden="true" className="ml-1 text-[#DC2626]">
              *
            </span>
          </span>
          <RoleChecklist
            roles={roles}
            selected={selectedRoles}
            onToggle={(roleId, checked) => {
              setSelectedRoles((current) =>
                checked ? [...current, roleId] : current.filter((id) => id !== roleId),
              );
              if (error) setError("");
            }}
          />
        </div>

        {error && (
          <p className="text-[12px] text-[#B91C1C]" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function EditUserRolesModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setSelected(user.roleIds);
      setError("");
      setBusy(false);
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (selected.length === 0) {
      setError("普通用户至少需要保留一个角色");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/users/${user.id}/roles`, {
        method: "PUT",
        body: JSON.stringify({ roleIds: selected }),
      });
      toast.success(`已更新 ${user.username} 的角色`);
      onClose();
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={user ? `调整角色：${user.username}` : "调整角色"}
      description="多角色权限自动取并集，保存后对已签发 API Key 立即生效。"
      size="sm"
      busy={busy}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>
            保存角色
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <RoleChecklist
          roles={roles}
          selected={selected}
          onToggle={(roleId, checked) => {
            setSelected((current) =>
              checked ? [...current, roleId] : current.filter((id) => id !== roleId),
            );
            if (error) setError("");
          }}
        />
        {error && (
          <p className="text-[12px] text-[#B91C1C]" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
