import { useId, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "../lib/api";
import { useRoleManager } from "../hooks/useRoleManager";
import { PageHeader } from "../components/layout/PageHeader";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  SearchInput,
  Skeleton,
  Switch,
  cn,
} from "../components/ui";
import { RoleGrantTree } from "../components/domain/RoleGrantTree";
import type { Role } from "../types";

export function RolesPage({ setError: _setError }: { setError?: (error: string) => void }) {
  const manager = useRoleManager();
  const [roleSearch, setRoleSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");
  const [onlyGranted, setOnlyGranted] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ label: string; run: () => void } | null>(null);
  const newRoleInputId = useId();

  const guardDirty = (label: string, run: () => void) => {
    if (manager.dirtyCount > 0) {
      setPendingAction({ label, run });
      return;
    }
    run();
  };

  const selectedRole = useMemo(
    () => manager.roles.find((role) => role.id === manager.selectedRoleId) ?? null,
    [manager.roles, manager.selectedRoleId],
  );

  const visibleRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return q ? manager.roles.filter((role) => role.name.toLowerCase().includes(q)) : manager.roles;
  }, [manager.roles, roleSearch]);

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setCreateError("请输入角色名称");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const result = await api<{ role: Role }>("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      setNewRoleName("");
      setCreateOpen(false);
      toast.success(`已创建角色 ${result.role.name}`);
      await manager.loadAll(result.role.id);
    } catch (reason) {
      setCreateError(errorMessage(reason));
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!selectedRole) return;
    setDeleting(true);
    try {
      await api<void>(`/api/admin/roles/${selectedRole.id}`, { method: "DELETE" });
      toast.success(`已删除角色 ${selectedRole.name}`);
      setDeleteOpen(false);
      manager.setSelectedRoleId("");
      await manager.loadAll();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  const allExpanded = manager.services.every((service) => expandedIds[service.id] ?? true);
  const toggleAllExpanded = () => {
    const nextValue = !allExpanded;
    const next: Record<string, boolean> = {};
    for (const service of manager.services) next[service.id] = nextValue;
    setExpandedIds(next);
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        title="角色与授权"
        description="按服务与工具粒度分配角色访问权限；多角色取并集，未授权资源默认隐藏并拒绝调用。"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={manager.refreshingPage}
              onClick={() =>
                guardDirty("刷新将丢失尚未保存的授权更改", () => {
                  void manager.loadAll(manager.selectedRoleId);
                  if (manager.selectedRoleId) void manager.loadGrants(manager.selectedRoleId);
                })
              }
              aria-label="刷新角色"
            >
              <RefreshCw
                size={14}
                strokeWidth={1.75}
                className={cn(manager.refreshingPage && "animate-spin")}
              />
              <span>刷新</span>
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} strokeWidth={1.75} />
              <span>新建角色</span>
            </Button>
          </>
        }
      />

      {manager.pageError ? (
        <EmptyState
          title="无法加载角色与授权数据"
          description={manager.pageError}
          action={
            <Button variant="primary" onClick={() => void manager.loadAll(manager.selectedRoleId)}>
              重试
            </Button>
          }
        />
      ) : manager.loadingPage ? (
        <div className="grid grid-cols-[240px_minmax(0,1fr)] max-[1024px]:grid-cols-1 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : manager.roles.length === 0 ? (
        <EmptyState
          icon={<Shield size={20} strokeWidth={1.75} />}
          title="尚未创建自定义角色"
          description="创建角色后即可按工具粒度配置访问策略，并在用户管理页分配给普通用户。"
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} strokeWidth={1.75} />
              <span>创建第一个角色</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[240px_minmax(0,1fr)] max-[1024px]:grid-cols-1 gap-4 items-start">
          <aside className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-3 flex flex-col gap-2.5 shadow-[var(--shadow-xs)]">
            <SearchInput
              value={roleSearch}
              onValueChange={setRoleSearch}
              placeholder="搜索角色…"
              className="min-w-0 w-full"
            />
            <nav className="flex flex-col gap-1" aria-label="角色列表">
              {visibleRoles.map((role) => {
                const active = manager.selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      if (role.id !== manager.selectedRoleId) {
                        guardDirty(`切换至角色「${role.name}」将丢失尚未保存的修改`, () =>
                          manager.setSelectedRoleId(role.id),
                        );
                      }
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-[var(--radius-sm)] text-left cursor-pointer transition-colors",
                      active
                        ? "bg-[#EFF6FF] text-[#1D4ED8]"
                        : "hover:bg-[#EEF0F4] text-[#111827]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={14} strokeWidth={1.75} className="shrink-0" />
                      <span className="text-[13px] font-medium truncate">{role.name}</span>
                    </div>
                    <div className="mt-1 pl-5 flex items-center gap-2 font-mono text-[11px] text-[#5B6270] tabular-nums">
                      <span>{role.grantCount ?? 0} 项授权</span>
                      <span aria-hidden="true">·</span>
                      <span>{role.userCount ?? 0} 人</span>
                    </div>
                  </button>
                );
              })}
              {visibleRoles.length === 0 && (
                <p className="py-4 text-center text-[12px] text-[#5B6270]">无匹配角色</p>
              )}
            </nav>
          </aside>

          <div className="min-w-0 flex flex-col gap-4 pb-20">
            <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 flex flex-col gap-3 shadow-[var(--shadow-xs)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[16px] font-semibold text-[#111827]">
                    {selectedRole?.name ?? "资源授权"}
                  </h2>
                  <Badge tone="info" mono>
                    已选 {manager.draftGrants.length} 项
                  </Badge>
                  {selectedRole && (selectedRole.userCount ?? 0) > 0 && (
                    <Badge tone="neutral">已分配 {selectedRole.userCount} 名用户</Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selectedRole}
                  className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  <span>删除角色</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#EEF0F4]">
                <div className="flex flex-wrap items-center gap-3">
                  <SearchInput
                    value={toolSearch}
                    onValueChange={setToolSearch}
                    placeholder="搜索服务、工具或技能…"
                    className="w-60 max-[768px]:w-full"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={onlyGranted}
                      aria-label="仅看已授权"
                      onCheckedChange={setOnlyGranted}
                    />
                    <span className="text-[12px] text-[#4B5563]">仅看已授权</span>
                  </div>
                </div>

                <Button size="sm" variant="secondary" onClick={toggleAllExpanded}>
                  {allExpanded ? "全部折叠" : "全部展开"}
                </Button>
              </div>
            </div>

            {manager.grantsError ? (
              <EmptyState
                title="加载角色授权失败"
                description={manager.grantsError}
                action={
                  <Button
                    variant="primary"
                    onClick={() => void manager.loadGrants(manager.selectedRoleId)}
                  >
                    重试
                  </Button>
                }
              />
            ) : manager.loadingGrants ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <RoleGrantTree
                services={manager.services}
                resources={manager.resources}
                grants={manager.draftGrants}
                toolSearch={toolSearch}
                onlyGranted={onlyGranted}
                expandedIds={expandedIds}
                onToggleExpand={(id) =>
                  setExpandedIds((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
                }
                onChangeGrants={manager.setDraftGrants}
              />
            )}

            {manager.dirtyCount > 0 && (
              <div className="sticky bottom-4 z-20 rounded-[var(--radius-md)] border border-[#BFDBFE] bg-white/95 backdrop-blur px-4 py-3 shadow-[var(--shadow-md)] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-[#111827] tabular-nums">
                  有 {manager.dirtyCount} 项未保存更改
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={manager.saving}
                    onClick={() => manager.setDraftGrants(manager.savedGrants)}
                  >
                    撤销
                  </Button>
                  <Button
                    variant="primary"
                    loading={manager.saving}
                    onClick={() => void manager.saveGrants()}
                  >
                    {manager.saving ? "保存中…" : "保存授权"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setNewRoleName("");
            setCreateError("");
          }
        }}
        title="新建角色"
        description="创建后可在右侧授权树中按服务和工具精确授权。"
        size="sm"
        busy={creating}
        footer={
          <>
            <Button variant="secondary" disabled={creating} onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="create-role-form" variant="primary" loading={creating}>
              创建角色
            </Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={(e) => void createRole(e)}>
          <Field label="角色名称" htmlFor={newRoleInputId} required error={createError || undefined}>
            <Input
              id={newRoleInputId}
              autoFocus
              value={newRoleName}
              placeholder="例如：数据分析员"
              onChange={(event) => {
                setNewRoleName(event.target.value);
                if (createError) setCreateError("");
              }}
              required
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tone="danger"
        title="删除角色"
        description={
          (selectedRole?.userCount ?? 0) > 0
            ? `该角色当前仍分配给 ${selectedRole?.userCount} 名用户，无法直接删除，请先在「用户」页面移除关联。`
            : "删除角色将永久清空其关联的资源授权配置。"
        }
        entity={selectedRole?.name}
        confirmLabel="确认删除"
        busy={deleting}
        onConfirm={confirmDeleteRole}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        tone="warning"
        title="放弃未保存的授权更改？"
        description={pendingAction?.label}
        confirmLabel="继续"
        onConfirm={() => {
          const run = pendingAction?.run;
          setPendingAction(null);
          run?.();
        }}
      />
    </section>
  );
}
