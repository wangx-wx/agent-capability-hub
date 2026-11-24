import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Info, KeyRound, Plus, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, formatDateTime, isAbortError } from "../lib/api";
import { PageHeader } from "../components/layout/PageHeader";
import { FilterToolbar } from "../components/layout/FilterToolbar";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  Tag,
  cn,
} from "../components/ui";
import { CreateUserModal, EditUserRolesModal } from "../components/domain/UserModals";
import type { Role, SecretReveal, User } from "../types";

interface UsersPageProps {
  currentUserId: string;
  setError?: (error: string) => void;
  onReveal: (secret: SecretReveal) => void;
  onOpenKeys: (userId: string) => void;
  onNavigateRoles?: () => void;
}

type StatusFilter = "all" | "active" | "disabled";
const ALL_ROLES = "__all__";

export function UsersPage({
  currentUserId,
  onReveal,
  onOpenKeys,
  onNavigateRoles,
}: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRolesUser, setEditingRolesUser] = useState<User | null>(null);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [enablingId, setEnablingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    try {
      const [userResult, roleResult] = await Promise.all([
        api<{ users: User[] }>("/api/admin/users", { signal: controller.signal }),
        api<{ roles: Role[] }>("/api/admin/roles", { signal: controller.signal }),
      ]);
      setUsers(userResult.users);
      setRoles(roleResult.roles.filter((role) => !role.isAdmin));
      setLoadError("");
    } catch (reason) {
      if (isAbortError(reason)) return;
      setLoadError(errorMessage(reason));
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((entry) => {
      if (statusFilter === "active" && !entry.active) return false;
      if (statusFilter === "disabled" && entry.active) return false;
      if (roleFilter !== ALL_ROLES && !entry.roleIds.includes(roleFilter)) return false;
      if (q && !entry.username.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, statusFilter, roleFilter]);

  const enableUser = async (user: User) => {
    setEnablingId(user.id);
    try {
      await api<void>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: true }),
      });
      toast.success(`已重新启用用户 ${user.username}`);
      await load();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setEnablingId(null);
    }
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    setBusyAction(true);
    try {
      await api<void>(`/api/admin/users/${disableTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      });
      toast.success(`已停用用户 ${disableTarget.username}`);
      setDisableTarget(null);
      await load();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setBusyAction(false);
    }
  };

  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    setBusyAction(true);
    try {
      const result = await api<{ newPassword: string }>(`/api/admin/users/${resetTarget.id}/password`, {
        method: "POST",
      });
      const target = resetTarget;
      setResetTarget(null);
      onReveal({
        kind: "password",
        title: `用户 ${target.username} 的新密码`,
        value: result.newPassword,
      });
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        title="用户"
        description="管理平台本地账号，分配一个或多个访问角色并管理账号启停与密码重置。"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={refreshing}
              onClick={() => void load()}
              aria-label="刷新用户"
            >
              <RefreshCw size={14} strokeWidth={1.75} className={cn(refreshing && "animate-spin")} />
              <span>刷新</span>
            </Button>
            <Button
              variant="primary"
              disabled={!loading && roles.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} strokeWidth={1.75} />
              <span>新建用户</span>
            </Button>
          </>
        }
      />

      {!loading && roles.length === 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-[13px] text-[#1D4ED8]">
          <div className="flex items-center gap-2">
            <Info size={16} strokeWidth={1.75} className="shrink-0" />
            <span>尚未创建自定义角色；普通用户至少需要分配一个角色，请先创建角色并配置授权。</span>
          </div>
          {onNavigateRoles && (
            <Button size="sm" variant="secondary" onClick={onNavigateRoles}>
              <span>前往角色与授权</span>
              <ArrowRight size={14} strokeWidth={1.75} />
            </Button>
          )}
        </div>
      )}

      {loadError ? (
        <EmptyState
          title="无法加载用户列表"
          description={loadError}
          action={
            <Button variant="primary" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      ) : (
        <>
          <FilterToolbar
            left={
              <>
                <SearchInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="搜索账号…"
                  className="w-64 max-[768px]:w-full"
                />
                <SegmentedControl<StatusFilter>
                  aria-label="按账号状态筛选"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "all", label: "全部", count: users.length },
                    { value: "active", label: "启用", count: users.filter((u) => u.active).length },
                    { value: "disabled", label: "停用", count: users.filter((u) => !u.active).length },
                  ]}
                />
                <Select
                  aria-label="按角色筛选"
                  value={roleFilter}
                  onValueChange={setRoleFilter}
                  options={[
                    { value: ALL_ROLES, label: "全部角色" },
                    ...roles.map((role) => ({ value: role.id, label: role.name })),
                  ]}
                />
              </>
            }
            right={
              <span className="text-[12px] text-[#5B6270] tabular-nums">
                显示 {filteredUsers.length} / {users.length} 名用户
              </span>
            }
          />

          {loading ? (
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#EEF0F4] border-b border-[#E2E5EC]">
                    <tr className="text-[12px] font-medium text-[#4B5563]">
                      <th className="px-4 py-2.5 whitespace-nowrap">账号</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">角色</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">状态</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">创建时间</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E5EC] text-[13px]">
                    {filteredUsers.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <strong className="font-semibold text-[#111827]">{entry.username}</strong>
                            {entry.isAdmin && <Badge tone="info">管理员</Badge>}
                            {entry.id === currentUserId && <Badge tone="neutral">当前登录</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {entry.isAdmin ? (
                            <span className="text-[12px] text-[#5B6270]">固定管理员角色</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {entry.roleIds.map((roleId) => (
                                <Tag key={roleId}>{roleNames.get(roleId) ?? "已删除角色"}</Tag>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge tone={entry.active ? "ok" : "err"} dot>
                            {entry.active ? "启用" : "停用"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-[#4B5563] tabular-nums">
                          {entry.createdAt ? formatDateTime(entry.createdAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {!entry.isAdmin && (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingRolesUser(entry)}
                              >
                                <ShieldCheck size={13} strokeWidth={1.75} />
                                <span>调整角色</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onOpenKeys(entry.id)}
                              >
                                <KeyRound size={13} strokeWidth={1.75} />
                                <span>Keys</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setResetTarget(entry)}
                              >
                                重置密码
                              </Button>
                              {entry.active ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                                  onClick={() => setDisableTarget(entry)}
                                >
                                  <UserX size={13} strokeWidth={1.75} />
                                  <span>停用</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  loading={enablingId === entry.id}
                                  onClick={() => void enableUser(entry)}
                                >
                                  启用
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-[#5B6270]">
                          {users.length === 0 ? "暂无用户" : "没有符合当前筛选条件的用户"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <CreateUserModal
        open={createOpen}
        roles={roles}
        onClose={() => setCreateOpen(false)}
        onCreated={(createdUser, initialPassword) => {
          onReveal({
            kind: "password",
            title: `用户 ${createdUser.username} 的初始密码`,
            value: initialPassword,
          });
          void load();
        }}
      />

      <EditUserRolesModal
        user={editingRolesUser}
        roles={roles}
        onClose={() => setEditingRolesUser(null)}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        tone="danger"
        title="停用用户"
        description="停用账号后将立即阻止该用户的一切平台与网关访问："
        entity={disableTarget?.username}
        consequences={[
          "立即踢出该用户的全部活跃网页会话",
          "永久吊销该用户名下全部有效 API Keys（重新启用账号后无法恢复旧 Key）",
          "历史调用审计与个人累计统计记录保留",
        ]}
        confirmLabel="确认停用"
        busy={busyAction}
        onConfirm={confirmDisable}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        tone="warning"
        title="重置用户密码"
        description="系统将生成新的随机一次性密码："
        entity={resetTarget?.username}
        consequences={[
          "立即注销该用户的所有网页会话",
          "新密码仅在弹窗中显示一次，关闭后不可再次查看",
        ]}
        confirmLabel="确认重置"
        busy={busyAction}
        onConfirm={confirmResetPassword}
      />
    </section>
  );
}
