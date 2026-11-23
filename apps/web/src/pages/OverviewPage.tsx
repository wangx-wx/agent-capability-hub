import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Terminal } from "lucide-react";
import { api } from "../lib/api";
import { CopyButton } from "../components/CopyButton";
import { UsageCard } from "../components/UsageCard";
import type { ApiKey, SessionUser } from "../types";

interface OverviewPageProps {
  user: SessionUser;
  onPasswordChanged: () => void;
}

export function OverviewPage({ user, onPasswordChanged }: OverviewPageProps) {
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      api<{ status: string; database: string }>("/api/health")
        .then(setHealth)
        .catch(() => setHealth({ status: "error", database: "unavailable" })),
      api<{ keys: ApiKey[] }>("/api/keys")
        .then((result) => setKeys(result.keys))
        .catch(() => setKeys([])),
    ]);
  }, [refreshToken]);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    try {
      await api<void>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      onPasswordChanged();
    } catch (reason) {
      setPasswordMessage(reason instanceof Error ? reason.message : "修改密码失败");
    }
  };

  const activeKeyCount = keys.filter((key) => !key.revokedAt).length;
  const mcpEndpoint = `${window.location.origin}/mcp`;

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">01</span>
            <span>平台概览</span>
          </p>
          <h1>欢迎，{user.username}</h1>
          <p className="section-description">
            {user.isAdmin
              ? "查看本地实例运行状态、调用统计，并管理下游服务、角色授权与 API 凭证。"
              : "查看本地实例状态、个人正式调用统计，并管理你的 Agent API 凭证。"}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setRefreshToken((value) => value + 1)}
          aria-label="刷新状态"
          title="刷新状态"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="overview-grid">
        <div className="overview-status-col">
          <div className="panel-kicker">
            <h2>实例运行状态</h2>
            <span>RUNTIME</span>
          </div>
          <div className="index-list">
            <div className="index-row">
              <span className="index-num">01</span>
              <div className="index-meta">
                <strong>API 服务</strong>
                <small>Express · 本地进程</small>
              </div>
              <span className={`badge ${health?.status === "ok" ? "badge-ok" : "badge-warn"}`}>
                <span className="status-dot" />
                {health?.status === "ok" ? "运行正常" : "检查中"}
              </span>
            </div>

            <div className="index-row">
              <span className="index-num">02</span>
              <div className="index-meta">
                <strong>数据库</strong>
                <small>SQLite · 单实例持久化</small>
              </div>
              <span className={`badge ${health?.database === "ok" ? "badge-ok" : "badge-err"}`}>
                <span className="status-dot" />
                {health?.database === "ok" ? "已连接" : "不可用"}
              </span>
            </div>

            <div className="index-row">
              <span className="index-num">03</span>
              <div className="index-meta">
                <strong>你的 API Keys</strong>
                <small>当前有效签发凭证</small>
              </div>
              <span className="index-value tabular">{activeKeyCount}</span>
            </div>
          </div>
        </div>

        <UsageCard refreshToken={refreshToken} />
      </div>

      <div className="editorial-section">
        <div className="section-subheading">
          <div>
            <h2>MCP 接入</h2>
            <p>使用你的 API Key 作为 Bearer 凭证，连接当前实例的 MCP 地址。</p>
          </div>
        </div>
        <div className="endpoint-box">
          <div className="endpoint-main">
            <Terminal size={17} strokeWidth={1.5} className="endpoint-icon" />
            <div className="endpoint-copy">
              <code>{mcpEndpoint}</code>
              <span>工具列表按角色授权过滤；服务目录授权不会自动开放子工具。</span>
            </div>
          </div>
          <CopyButton value={mcpEndpoint} label="复制地址" ariaLabel="复制 MCP 地址" />
        </div>
      </div>

      <div className="editorial-section">
        <div className="section-subheading">
          <div>
            <h2>修改密码</h2>
            <p>修改后当前账号的所有网页会话都会退出，需要重新登录。</p>
          </div>
        </div>
        <form className="inline-create password-form" onSubmit={(event) => void changePassword(event)}>
          <label>
            当前密码
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <button className="btn btn-primary">更新密码</button>
          {passwordMessage && (
            <span className="form-error" role="alert">
              {passwordMessage}
            </span>
          )}
        </form>
      </div>
    </section>
  );
}
