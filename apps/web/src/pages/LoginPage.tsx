import { useId, useState, type FormEvent } from "react";
import { Boxes, KeyRound, ShieldCheck, Terminal } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { Button, Field, Input, PasswordInput } from "../components/ui";
import type { SessionUser } from "../types";

interface LoginPageProps {
  onLogin: (user: SessionUser) => void;
}

const HIGHLIGHTS = [
  {
    icon: Terminal,
    title: "协议接入与差异确认",
    desc: "支持 Streamable HTTP、旧版 SSE，以及 OpenAPI / cURL 导入预览确认。",
  },
  {
    icon: ShieldCheck,
    title: "按工具粒度的角色授权",
    desc: "未授权工具对调用方默认隐藏并拒绝调用，多角色权限自动取并集。",
  },
  {
    icon: KeyRound,
    title: "本地 SQLite 审计与凭证",
    desc: "签发独立 API Key，记录每次正式调用的时间、耗时、用户与终态结果。",
  },
];

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usernameId = useId();
  const passwordId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("请输入账号");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: trimmed, password }),
      });
      onLogin(result.user);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] max-[1024px]:grid-cols-1 bg-[#F5F6F8]">
      <section className="flex flex-col justify-between px-12 py-10 max-[768px]:px-5 max-[768px]:py-8 border-r max-[1024px]:border-r-0 max-[1024px]:border-t border-[#E2E5EC]">
        <div className="inline-flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-grid place-items-center h-8 w-8 rounded-[var(--radius-sm)] bg-[#18181B] text-white shrink-0"
          >
            <Boxes size={18} strokeWidth={1.75} />
          </span>
          <strong className="text-[15px] font-semibold text-[#111827]">Agent Hub</strong>
          <span className="text-[12px] text-[#5B6270]">能力中台</span>
        </div>

        <div className="max-w-[520px] my-auto py-10 max-[1024px]:py-6">
          <h1 className="text-[28px] max-[768px]:text-[24px] leading-[1.25] font-semibold tracking-[-0.025em] text-[#111827]">
            统一管理 MCP 服务与访问凭证
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#4B5563]">
            通过原生 MCP 或 REST API 接入下游能力，按角色精确控制工具可见性与调用权限，所有正式调用均写入本地审计记录。
          </p>

          <div className="mt-8 flex flex-col divide-y divide-[#E2E5EC] border-y border-[#E2E5EC]">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="py-3.5 flex items-start gap-3">
                <span className="mt-0.5 inline-grid place-items-center h-7 w-7 rounded-[var(--radius-sm)] bg-white border border-[#E2E5EC] text-[#2563EB] shrink-0">
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <div>
                  <strong className="block text-[13px] font-semibold text-[#111827]">{title}</strong>
                  <small className="block mt-0.5 text-[12px] text-[#4B5563] leading-relaxed">
                    {desc}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[12px] font-mono text-[#5B6270]">自托管单实例 · SQLite 持久化</div>
      </section>

      <section className="flex items-center justify-center px-8 py-12 max-[768px]:px-5 bg-white max-[1024px]:order-first">
        <div className="w-full max-w-[360px]">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[12px] font-medium mb-3">
            身份验证
          </span>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">
            登录控制台
          </h2>
          <p className="mt-1.5 text-[13px] text-[#4B5563]">
            使用管理员或部署者分配的本地账号与密码继续。
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
            <Field label="账号" htmlFor={usernameId} required>
              <Input
                id={usernameId}
                controlSize="lg"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (error) setError("");
                }}
                required
              />
            </Field>

            <Field label="密码" htmlFor={passwordId} required>
              <PasswordInput
                id={passwordId}
                controlSize="lg"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
                required
              />
            </Field>

            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#B91C1C]"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              variant="primary"
              loading={submitting}
              className="w-full mt-1"
            >
              {submitting ? "正在登录…" : "登录"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
