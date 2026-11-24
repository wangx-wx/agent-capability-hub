import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, Server, Shield, Terminal, Users } from "lucide-react";
import { api, isAbortError } from "../lib/api";
import type { HealthState } from "../hooks/useHealth";
import { PageHeader } from "../components/layout/PageHeader";
import { UsageCard } from "../components/UsageCard";
import { Badge, Button, CopyButton, SegmentedControl, Skeleton, cn } from "../components/ui";
import type { ApiKey, Role, Service, SessionUser, User, ViewId } from "../types";

interface OverviewPageProps {
  user: SessionUser;
  health: HealthState;
  healthRefreshing: boolean;
  onRefreshHealth: () => Promise<void> | void;
  onNavigate: (view: ViewId) => void;
}

type ClientTab = "claude" | "codex" | "http";

export function OverviewPage({
  user,
  health,
  healthRefreshing,
  onRefreshHealth,
  onNavigate,
}: OverviewPageProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [adminSummary, setAdminSummary] = useState<{
    servicesTotal: number;
    servicesEnabled: number;
    usersTotal: number;
    usersActive: number;
    customRoles: number;
  } | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clientTab, setClientTab] = useState<ClientTab>("claude");

  useEffect(() => {
    const controller = new AbortController();
    setKeysLoading(true);
    const keyReq = api<{ keys: ApiKey[] }>("/api/keys", { signal: controller.signal })
      .then((result) => setKeys(result.keys))
      .catch((reason) => {
        if (!isAbortError(reason)) setKeys([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setKeysLoading(false);
      });

    const adminReq = user.isAdmin
      ? Promise.all([
          api<{ services: Service[] }>("/api/admin/services", { signal: controller.signal }),
          api<{ users: User[] }>("/api/admin/users", { signal: controller.signal }),
          api<{ roles: Role[] }>("/api/admin/roles", { signal: controller.signal }),
        ])
          .then(([sRes, uRes, rRes]) => {
            setAdminSummary({
              servicesTotal: sRes.services.length,
              servicesEnabled: sRes.services.filter((s) => s.enabled).length,
              usersTotal: uRes.users.length,
              usersActive: uRes.users.filter((u) => u.active).length,
              customRoles: rRes.roles.filter((r) => !r.isAdmin).length,
            });
          })
          .catch(() => undefined)
      : Promise.resolve();

    void Promise.all([keyReq, adminReq]);
    return () => controller.abort();
  }, [refreshToken, user.isAdmin]);

  const nowIso = new Date().toISOString();
  const activeKeyCount = keys.filter(
    (key) => !key.revokedAt && (!key.expiresAt || key.expiresAt > nowIso),
  ).length;
  const mcpEndpoint = `${window.location.origin}/mcp`;

  const apiBadge =
    health.status === "loading"
      ? { tone: "warn" as const, label: "检查中", pulse: true }
      : health.status === "ok"
        ? { tone: "ok" as const, label: "运行正常", pulse: false }
        : { tone: "err" as const, label: "服务不可用", pulse: false };

  const dbBadge =
    health.database === "loading"
      ? { tone: "warn" as const, label: "检查中", pulse: true }
      : health.database === "ok"
        ? { tone: "ok" as const, label: "已连接", pulse: false }
        : { tone: "err" as const, label: "不可用", pulse: false };

  const snippetContent =
    clientTab === "claude"
      ? `# CLI 快速添加（local 范围）\nclaude mcp add --transport http --scope local agent-hub ${mcpEndpoint} \\\n  --header "Authorization: Bearer <platform-api-key>"\n\n# 或写入项目 .mcp.json（通过环境变量引用密钥）\n${JSON.stringify(
          {
            mcpServers: {
              "agent-hub": {
                type: "http",
                url: mcpEndpoint,
                headers: { Authorization: "Bearer ${ACH_API_KEY}" },
              },
            },
          },
          null,
          2,
        )}`
      : clientTab === "codex"
        ? `# CLI 快速添加\ncodex mcp add agent-hub --url ${mcpEndpoint} --bearer-token-env-var ACH_API_KEY\n\n# 或写入 .codex/config.toml\n[mcp_servers.agent-hub]\nurl = "${mcpEndpoint}"\nbearer_token_env_var = "ACH_API_KEY"\ntool_timeout_sec = 70`
        : `# Streamable HTTP 网关端点\nPOST ${mcpEndpoint}\nAuthorization: Bearer <platform-api-key>\nContent-Type: application/json\nAccept: application/json, text/event-stream`;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={`欢迎，${user.username}`}
        description={
          user.isAdmin
            ? "查看本地实例运行状态、个人正式调用统计与平台规模，并快速进入服务、授权与审计管理。"
            : "查看本地实例状态、个人正式调用统计，并获取你的 Agent MCP 网关接入配置。"
        }
        actions={
          <Button
            variant="secondary"
            disabled={healthRefreshing}
            aria-label="刷新状态"
            onClick={() => {
              void onRefreshHealth();
              setRefreshToken((v) => v + 1);
            }}
          >
            <RefreshCw
              size={14}
              strokeWidth={1.75}
              className={cn(healthRefreshing && "animate-spin")}
            />
            <span>刷新状态</span>
          </Button>
        }
        className="mb-0"
      />

      {user.isAdmin && (
        <div className="grid grid-cols-3 max-[768px]:grid-cols-1 gap-4">
          <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-grid place-items-center h-9 w-9 rounded-[var(--radius-sm)] bg-[#EFF6FF] text-[#2563EB]">
                <Server size={18} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[12px] text-[#4B5563]">MCP 服务</div>
                {adminSummary ? (
                  <div className="font-mono text-[16px] font-semibold text-[#111827] tabular-nums">
                    {adminSummary.servicesEnabled} / {adminSummary.servicesTotal} 已启用
                  </div>
                ) : (
                  <Skeleton className="mt-1 h-5 w-24" />
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("services")}>
              <span>管理</span>
              <ArrowRight size={13} strokeWidth={1.75} />
            </Button>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-grid place-items-center h-9 w-9 rounded-[var(--radius-sm)] bg-[#F0FDF4] text-[#15803D]">
                <Users size={18} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[12px] text-[#4B5563]">平台用户</div>
                {adminSummary ? (
                  <div className="font-mono text-[16px] font-semibold text-[#111827] tabular-nums">
                    {adminSummary.usersActive} / {adminSummary.usersTotal} 启用
                  </div>
                ) : (
                  <Skeleton className="mt-1 h-5 w-24" />
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("users")}>
              <span>管理</span>
              <ArrowRight size={13} strokeWidth={1.75} />
            </Button>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-4 shadow-[var(--shadow-sm)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-grid place-items-center h-9 w-9 rounded-[var(--radius-sm)] bg-[#FFFBEB] text-[#B45309]">
                <Shield size={18} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[12px] text-[#4B5563]">自定义角色</div>
                {adminSummary ? (
                  <div className="font-mono text-[16px] font-semibold text-[#111827] tabular-nums">
                    {adminSummary.customRoles} 个角色
                  </div>
                ) : (
                  <Skeleton className="mt-1 h-5 w-20" />
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("roles")}>
              <span>授权</span>
              <ArrowRight size={13} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1.25fr_1fr] max-[1024px]:grid-cols-1 gap-4">
        <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5 shadow-[var(--shadow-sm)] flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold text-[#111827]">实例运行状态</h2>
          <div className="divide-y divide-[#EEF0F4]">
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <strong className="block text-[13px] font-semibold text-[#111827]">API 服务</strong>
                <small className="text-[12px] text-[#4B5563]">Express · 本地服务进程</small>
              </div>
              <Badge tone={apiBadge.tone} dot pulse={apiBadge.pulse}>
                {apiBadge.label}
              </Badge>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <strong className="block text-[13px] font-semibold text-[#111827]">数据库</strong>
                <small className="text-[12px] text-[#4B5563]">SQLite · 单实例持久化</small>
              </div>
              <Badge tone={dbBadge.tone} dot pulse={dbBadge.pulse}>
                {dbBadge.label}
              </Badge>
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <div>
                <strong className="block text-[13px] font-semibold text-[#111827]">有效 API Keys</strong>
                <small className="text-[12px] text-[#4B5563]">未吊销且未过期的当前可用凭证</small>
              </div>
              {keysLoading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[18px] font-semibold text-[#111827] tabular-nums">
                    {activeKeyCount}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => onNavigate("keys")}>
                    管理 Keys
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <UsageCard refreshToken={refreshToken} />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#111827]">MCP 客户端接入</h2>
            <p className="mt-1 text-[12px] text-[#4B5563]">
              使用你的 API Key 作为 Bearer 凭证连接网关；工具列表按角色授权过滤，服务目录授权不会自动开放子工具。
            </p>
          </div>
          <SegmentedControl<ClientTab>
            aria-label="选择客户端接入示例"
            value={clientTab}
            onValueChange={setClientTab}
            options={[
              { value: "claude", label: "Claude Code" },
              { value: "codex", label: "Codex" },
              { value: "http", label: "通用 HTTP" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#F5F6F8] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Terminal size={16} strokeWidth={1.75} className="text-[#2563EB] shrink-0" />
            <code className="font-mono text-[13px] font-medium text-[#111827] break-all">
              {mcpEndpoint}
            </code>
          </div>
          <CopyButton size="sm" value={mcpEndpoint} label="复制地址" ariaLabel="复制 MCP 地址" />
        </div>

        <div className="relative">
          <pre className="m-0 overflow-x-auto rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-[#18181B] text-[#F8FAFC] p-4 font-mono text-[12px] leading-relaxed">
            {snippetContent}
          </pre>
          <div className="mt-2 flex justify-end">
            <CopyButton size="sm" value={snippetContent} label="复制配置片段" ariaLabel="复制配置片段" />
          </div>
        </div>
      </div>
    </section>
  );
}
