import { useState, type FormEvent } from "react";
import { Boxes } from "lucide-react";
import { api } from "../lib/api";
import type { SessionUser } from "../types";

interface LoginPageProps {
  onLogin: (user: SessionUser) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-editorial">
        <div className="login-brand">
          <span className="brand-icon" aria-hidden="true">
            <Boxes size={20} strokeWidth={1.5} />
          </span>
          <strong>Agent Hub</strong>
          <span>能力中台</span>
        </div>

        <div className="login-hero">
          <p className="eyebrow">
            <span className="eyebrow-index">00</span>
            <span>AGENT CAPABILITY HUB</span>
          </p>
          <h1>统一管理 MCP 服务、REST 工具与访问凭证</h1>
          <p>
            集中登记下游 MCP 与 REST 接口，按角色精确控制工具可见性与调用权限，所有正式调用均写入本地审计记录。
          </p>

          <div className="login-index-list">
            <div className="login-index-row">
              <span>01</span>
              <div>
                <strong>协议接入与差异确认</strong>
                <small>支持 Streamable HTTP、旧版 SSE 以及 OpenAPI / cURL 转 REST 工具</small>
              </div>
            </div>
            <div className="login-index-row">
              <span>02</span>
              <div>
                <strong>按工具粒度的角色授权</strong>
                <small>未授权工具对调用方默认隐藏，多角色权限自动取并集</small>
              </div>
            </div>
            <div className="login-index-row">
              <span>03</span>
              <div>
                <strong>本地 SQLite 审计与凭证</strong>
                <small>签发独立 API Key，记录每次正式调用的时间、用户与结果</small>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footnote">
          <span className="instance-dot" />
          <span>自托管单实例 · SQLite</span>
        </div>
      </section>

      <section className="login-form-column">
        <div className="login-panel">
          <p className="eyebrow">
            <span className="eyebrow-index">AUTH</span>
            <span>身份验证</span>
          </p>
          <h1>登录控制台</h1>
          <p className="section-description">使用部署者提供的本地账号和密码继续。</p>
          <form className="form-stack login-form" onSubmit={(event) => void submit(event)}>
            <label>
              账号
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label>
              密码
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? "正在登录…" : "登录"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
