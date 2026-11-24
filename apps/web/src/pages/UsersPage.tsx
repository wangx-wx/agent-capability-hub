import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import type { Role, SecretReveal, User } from "../types";

interface UsersPageProps {
  setError: (error: string) => void;
  onReveal: (secret: SecretReveal) => void;
  onOpenKeys: (userId: string) => void;
}

export function UsersPage({ setError, onReveal, onOpenKeys }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [username, setUsername] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userResult, roleResult] = await Promise.all([
        api<{ users: User[] }>("/api/admin/users"),
        api<{ roles: Role[] }>("/api/admin/roles"),
      ]);
      setUsers(userResult.users);
      setRoles(roleResult.roles.filter((role) => !role.isAdmin));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载用户");
    }
  }, [setError]);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ user: User; initialPassword: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, roleIds: selectedRoles }),
      });
      setUsername("");
      setSelectedRoles([]);
      onReveal({ kind: "password", title: `用户 ${result.user.username} 的初始密码`, value: result.initialPassword });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建用户失败");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await api<void>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新用户失败");
    }
  };

  const resetPassword = async (user: User) => {
    try {
      const result = await api<{ newPassword: string }>(`/api/admin/users/${user.id}/password`, {
        method: "POST",
      });
      onReveal({ kind: "password", title: `用户 ${user.username} 的新密码`, value: result.newPassword });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重置密码失败");
    }
  };

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">05</span>
            <span>访问管理</span>
          </p>
          <h1>用户</h1>
          <p className="section-description">创建本地账号，分配一个或多个访问角色。</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void load()}
          aria-label="刷新用户"
          title="刷新"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>
      </div>

      <form className="inline-create" onSubmit={(event) => void createUser(event)}>
        <label className="field-grow">
          账号
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <fieldset className="role-picker">
          <legend>分配角色</legend>
          {roles.map((role) => (
            <label key={role.id} className="check-option">
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={(event) =>
                  setSelectedRoles((current) =>
                    event.target.checked
                      ? [...current, role.id]
                      : current.filter((id) => id !== role.id),
                  )
                }
              />
              {role.name}
            </label>
          ))}
          {roles.length === 0 && <span className="muted">先创建一个角色</span>}
        </fieldset>
        <button className="btn btn-primary" disabled={busy || !roles.length}>
          <Plus size={14} strokeWidth={1.5} />
          <span>创建用户</span>
        </button>
      </form>

      <div className="table-frame">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>角色</th>
                <th>状态</th>
                <th className="actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="button-row">
                      <strong>{entry.username}</strong>
                      {entry.isAdmin && <span className="badge badge-accent">管理员</span>}
                    </div>
                  </td>
                  <td>
                    {entry.isAdmin ? (
                      <span className="muted">固定管理员角色</span>
                    ) : (
                      <>
                        <span>
                          {entry.roleIds.map((id) => roleNames.get(id) ?? "已删除角色").join("、")}
                        </span>
                        <RoleAssignment user={entry} roles={roles} onSaved={load} setError={setError} />
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${entry.active ? "badge-ok" : "badge-err"}`}>
                      <span className="status-dot" />
                      {entry.active ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="row-actions">
                    {!entry.isAdmin && (
                      <div className="row-actions-inner">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void resetPassword(entry)}
                        >
                          重置密码
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => onOpenKeys(entry.id)}
                        >
                          Keys
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void toggleActive(entry)}
                        >
                          {entry.active ? "停用" : "启用"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RoleAssignment({
  user,
  roles,
  onSaved,
  setError,
}: {
  user: User;
  roles: Role[];
  onSaved: () => Promise<void>;
  setError: (error: string) => void;
}) {
  const [selected, setSelected] = useState(user.roleIds);

  useEffect(() => setSelected(user.roleIds), [user.roleIds]);

  const save = async () => {
    try {
      await api(`/api/admin/users/${user.id}/roles`, {
        method: "PUT",
        body: JSON.stringify({ roleIds: selected }),
      });
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新角色失败");
    }
  };

  return (
    <details className="role-editor">
      <summary>编辑</summary>
      <div className="role-editor-menu">
        {roles.map((role) => (
          <label key={role.id} className="check-option">
            <input
              type="checkbox"
              checked={selected.includes(role.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, role.id]
                    : current.filter((id) => id !== role.id),
                )
              }
            />
            {role.name}
          </label>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => void save()}>
          保存角色
        </button>
      </div>
    </details>
  );
}
