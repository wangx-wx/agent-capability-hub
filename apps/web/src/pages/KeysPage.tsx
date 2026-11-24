import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, Plus, RefreshCw } from "lucide-react";
import { api, formatDateTime } from "../lib/api";
import type { ApiKey, SecretReveal, SessionUser, User } from "../types";

interface KeysPageProps {
  user: SessionUser;
  ownerId: string;
  setError: (error: string) => void;
  onReveal: (secret: SecretReveal) => void;
}

export function KeysPage({ user, ownerId, setError, onReveal }: KeysPageProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [ownerName, setOwnerName] = useState(user.username);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("choose");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);

  const targetUrl =
    user.isAdmin && ownerId !== user.id ? `/api/admin/users/${ownerId}/keys` : "/api/keys";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ keys: ApiKey[] }>(targetUrl);
      setKeys(result.keys);
      if (user.isAdmin && ownerId !== user.id) {
        const users = await api<{ users: User[] }>("/api/admin/users");
        setOwnerName(users.users.find((entry) => entry.id === ownerId)?.username ?? "用户");
      } else {
        setOwnerName(user.username);
      }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载 API Keys");
    } finally {
      setLoading(false);
    }
  }, [ownerId, setError, targetUrl, user.id, user.isAdmin, user.username]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (expiry === "choose") {
      setError("请选择过期时间或永久有效");
      return;
    }
    const path =
      user.isAdmin && ownerId !== user.id ? `/api/admin/users/${ownerId}/keys` : "/api/keys";
    try {
      const result = await api<{ key: ApiKey }>(path, {
        method: "POST",
        body: JSON.stringify({
          name,
          expiresAt: expiry === "permanent" ? null : new Date(expiresAt).toISOString(),
        }),
      });
      setName("");
      setExpiry("choose");
      setExpiresAt("");
      onReveal({ kind: "api-key", title: `API Key：${result.key.name}`, value: result.key.value });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建 API Key 失败");
    }
  };

  const revoke = async (key: ApiKey) => {
    try {
      await api<void>(`/api/keys/${key.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "吊销 Key 失败");
    }
  };

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">07</span>
            <span>凭证管理</span>
          </p>
          <h1>{ownerId === user.id ? "API Keys" : `${ownerName} · API Keys`}</h1>
          <p className="section-description">
            Bearer 凭证用于调用 MCP 网关与只读资源接口；明文保存在本地数据库，可重复复制。
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void load()}
          aria-label="刷新 Keys"
          title="刷新"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>
      </div>

      <form className="inline-create key-create" onSubmit={(event) => void create(event)}>
        <label className="field-grow">
          名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：本地 Codex"
            required
          />
        </label>
        <label>
          有效期
          <select value={expiry} onChange={(event) => setExpiry(event.target.value)} required>
            <option value="choose" disabled>
              请选择
            </option>
            <option value="permanent">永久有效</option>
            <option value="date">设置到期时间</option>
          </select>
        </label>
        {expiry === "date" && (
          <label>
            到期时间
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              required
            />
          </label>
        )}
        <button className="btn btn-primary">
          <Plus size={14} strokeWidth={1.5} />
          <span>创建 Key</span>
        </button>
      </form>

      <div className="table-frame">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>Key</th>
                <th>有效期</th>
                <th>状态</th>
                <th className="actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const expired = key.expiresAt !== null && key.expiresAt <= new Date().toISOString();
                const active = !key.revokedAt && !expired;
                return (
                  <tr key={key.id}>
                    <td>
                      <strong>{key.name}</strong>
                    </td>
                    <td>
                      <code className="key-preview">{key.value.slice(0, 12)}…</code>
                    </td>
                    <td className="mono tabular">
                      {key.expiresAt ? formatDateTime(key.expiresAt) : "永久"}
                    </td>
                    <td>
                      <span className={`badge ${active ? "badge-ok" : "badge-err"}`}>
                        <span className="status-dot" />
                        {key.revokedAt ? "已吊销" : expired ? "已过期" : "有效"}
                      </span>
                    </td>
                    <td className="row-actions">
                      <div className="row-actions-inner">
                        <button
                          type="button"
                          className="icon-button small-icon"
                          onClick={() =>
                            onReveal({ kind: "api-key", title: `API Key：${key.name}`, value: key.value })
                          }
                          aria-label={`复制 ${key.name}`}
                          title="复制 Key"
                        >
                          <Copy size={13} strokeWidth={1.5} />
                        </button>
                        {active && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-danger-text"
                            onClick={() => void revoke(key)}
                          >
                            吊销
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !keys.length && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    暂无 API Key
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
