import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Eye, KeyRound, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, formatDateTime, isAbortError } from "../lib/api";
import { PageHeader } from "../components/layout/PageHeader";
import { FilterToolbar } from "../components/layout/FilterToolbar";
import {
  Badge,
  Button,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  IconButton,
  SearchInput,
  SegmentedControl,
  Skeleton,
  Tooltip,
  cn,
} from "../components/ui";
import { CreateKeyModal } from "../components/domain/CreateKeyModal";
import type { ApiKey, SecretReveal, SessionUser, User } from "../types";

interface KeysPageProps {
  user: SessionUser;
  ownerId: string;
  setError?: (error: string) => void;
  onReveal: (secret: SecretReveal) => void;
  onBackToUsers?: () => void;
  onSwitchToMine?: () => void;
  onOwnerResolved?: (ownerName: string | null) => void;
}

type KeyStatusFilter = "all" | "active" | "expired" | "revoked";

function keyStatus(key: ApiKey, nowIso: string): Exclude<KeyStatusFilter, "all"> {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt !== null && key.expiresAt <= nowIso) return "expired";
  return "active";
}

function maskKeyValue(value: string): string {
  if (value.length <= 16) return `${value.slice(0, 8)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function KeysPage({
  user,
  ownerId,
  onReveal,
  onBackToUsers,
  onSwitchToMine,
  onOwnerResolved,
}: KeysPageProps) {
  const isManaged = user.isAdmin && ownerId !== user.id;

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [ownerUser, setOwnerUser] = useState<User | null>(null);
  const [ownerResolved, setOwnerResolved] = useState(!isManaged);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KeyStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    const targetUrl = isManaged ? `/api/admin/users/${ownerId}/keys` : "/api/keys";
    try {
      const [keysResult, usersResult] = await Promise.all([
        api<{ keys: ApiKey[] }>(targetUrl, { signal: controller.signal }),
        isManaged
          ? api<{ users: User[] }>("/api/admin/users", { signal: controller.signal })
          : Promise.resolve(null),
      ]);
      setKeys(keysResult.keys);
      if (usersResult) {
        const found = usersResult.users.find((entry) => entry.id === ownerId) ?? null;
        setOwnerUser(found);
        setOwnerResolved(true);
        onOwnerResolved?.(found?.username ?? null);
      } else {
        setOwnerUser(null);
        setOwnerResolved(true);
        onOwnerResolved?.(null);
      }
      setLoadError("");
    } catch (reason) {
      if (isAbortError(reason)) return;
      setLoadError(errorMessage(reason));
      setOwnerResolved(true);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isManaged, ownerId, onOwnerResolved]);

  useEffect(() => {
    setOwnerResolved(!isManaged);
    void load();
    return () => {
      abortRef.current?.abort();
      onOwnerResolved?.(null);
    };
  }, [isManaged, load, onOwnerResolved]);

  const nowIso = new Date().toISOString();
  const soonCutoffMs = Date.now() + 7 * 86_400_000;

  const counts = useMemo(() => {
    let active = 0;
    let expired = 0;
    let revoked = 0;
    for (const key of keys) {
      const st = keyStatus(key, nowIso);
      if (st === "active") active += 1;
      else if (st === "expired") expired += 1;
      else revoked += 1;
    }
    return { all: keys.length, active, expired, revoked };
  }, [keys, nowIso]);

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((key) => {
      if (statusFilter !== "all" && keyStatus(key, nowIso) !== statusFilter) return false;
      if (q && !key.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [keys, search, statusFilter, nowIso]);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api<void>(`/api/keys/${revokeTarget.id}`, { method: "DELETE" });
      toast.success(`已吊销 API Key「${revokeTarget.name}」`);
      setRevokeTarget(null);
      await load();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setRevoking(false);
    }
  };

  const ownerDisabled = isManaged && ownerUser !== null && !ownerUser.active;
  const pageTitle = isManaged
    ? ownerResolved
      ? `${ownerUser?.username ?? "未知用户"} · API Keys`
      : "正在加载用户 API Keys…"
    : "API Keys";

  return (
    <section className="flex flex-col">
      {isManaged && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white px-4 py-2.5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 text-[13px] text-[#4B5563]">
            <span>正在代管用户凭证：</span>
            <strong className="text-[#111827]">{ownerUser?.username ?? "…"}</strong>
          </div>
          <div className="flex items-center gap-2">
            {onBackToUsers && (
              <Button size="sm" variant="secondary" onClick={onBackToUsers}>
                <ArrowLeft size={14} strokeWidth={1.75} />
                <span>返回用户列表</span>
              </Button>
            )}
            {onSwitchToMine && (
              <Button size="sm" variant="ghost" onClick={onSwitchToMine}>
                切换回我的 Keys
              </Button>
            )}
          </div>
        </div>
      )}

      <PageHeader
        title={pageTitle}
        description="Bearer 凭证用于调用 MCP 网关与只读资源接口；明文保存在本地数据库，可随时复制或吊销。"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={refreshing}
              onClick={() => void load()}
              aria-label="刷新 Keys"
            >
              <RefreshCw size={14} strokeWidth={1.75} className={cn(refreshing && "animate-spin")} />
              <span>刷新</span>
            </Button>
            <Button
              variant="primary"
              disabled={ownerDisabled || (isManaged && !ownerResolved)}
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} strokeWidth={1.75} />
              <span>创建 Key</span>
            </Button>
          </>
        }
      />

      {ownerDisabled && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#B45309]"
        >
          <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0" />
          <span>该用户当前已被停用，无法为其签发新的 API Key；请先在用户管理页重新启用该账号。</span>
        </div>
      )}

      {loadError ? (
        <EmptyState
          title="无法加载 API Keys"
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
                  placeholder="搜索 Key 名称…"
                  className="w-64 max-[768px]:w-full"
                />
                <SegmentedControl<KeyStatusFilter>
                  aria-label="按凭证状态筛选"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "all", label: "全部", count: counts.all },
                    { value: "active", label: "有效", count: counts.active },
                    { value: "expired", label: "已过期", count: counts.expired },
                    { value: "revoked", label: "已吊销", count: counts.revoked },
                  ]}
                />
              </>
            }
            right={
              <span className="text-[12px] text-[#5B6270] tabular-nums">
                显示 {filteredKeys.length} / {keys.length} 条凭证
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
                      <th className="px-4 py-2.5 whitespace-nowrap">名称</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">凭证</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">创建时间</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">有效期</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">状态</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E5EC] text-[13px]">
                    {filteredKeys.map((key) => {
                      const status = keyStatus(key, nowIso);
                      const isActive = status === "active";
                      const expiringSoon =
                        isActive &&
                        key.expiresAt !== null &&
                        Date.parse(key.expiresAt) <= soonCutoffMs;

                      return (
                        <tr key={key.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <strong className="font-semibold text-[#111827]">{key.name}</strong>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <code className="px-2 py-0.5 rounded bg-[#F5F6F8] border border-[#E2E5EC] font-mono text-[12px] text-[#111827]">
                                {maskKeyValue(key.value)}
                              </code>
                              {isActive && (
                                <CopyButton
                                  size="sm"
                                  iconOnly
                                  variant="ghost"
                                  value={key.value}
                                  ariaLabel={`复制 ${key.name}`}
                                />
                              )}
                              <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={`查看 ${key.name} 明文`}
                                title="查看明文"
                                onClick={() =>
                                  onReveal({
                                    kind: "api-key",
                                    title: `API Key：${key.name}`,
                                    value: key.value,
                                  })
                                }
                              >
                                <Eye size={14} strokeWidth={1.75} />
                              </IconButton>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-[#4B5563] tabular-nums">
                            {formatDateTime(key.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 font-mono text-[12px] text-[#111827] tabular-nums">
                              <span>{key.expiresAt ? formatDateTime(key.expiresAt) : "永久"}</span>
                              {expiringSoon && <Badge tone="warn">即将过期</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {status === "revoked" && key.revokedAt ? (
                              <Tooltip content={`吊销时间：${formatDateTime(key.revokedAt)}`}>
                                <span>
                                  <Badge tone="err" dot>
                                    已吊销
                                  </Badge>
                                </span>
                              </Tooltip>
                            ) : (
                              <Badge tone={isActive ? "ok" : "err"} dot>
                                {isActive ? "有效" : "已过期"}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                                onClick={() => setRevokeTarget(key)}
                              >
                                吊销
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredKeys.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          {keys.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 text-[#5B6270]">
                              <KeyRound size={20} strokeWidth={1.75} />
                              <span>暂无 API Key，点击右上角「创建 Key」签发凭证</span>
                            </div>
                          ) : (
                            <span className="text-[#5B6270]">没有符合筛选条件的 API Key</span>
                          )}
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

      <CreateKeyModal
        open={createOpen}
        ownerId={ownerId}
        isManaged={isManaged}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          onReveal({
            kind: "api-key",
            title: `API Key：${created.name}`,
            value: created.value,
          });
          void load();
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        tone="danger"
        title="吊销 API Key"
        description="吊销后该凭证将立即失效，确认继续吗？"
        entity={revokeTarget?.name}
        consequences={[
          "持有该 Key 的所有 Agent 客户端请求将立即被拒绝（401）",
          "吊销后无法恢复，历史调用审计与统计保留",
        ]}
        confirmLabel="确认吊销"
        busy={revoking}
        onConfirm={confirmRevoke}
      />
    </section>
  );
}
