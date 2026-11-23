import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Boxes,
  Check,
  Copy,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api } from "./api";
import { ServicesPage } from "./ServicesPage";

type User = { id: string; username: string; active: boolean; isAdmin: boolean; roleIds: string[] };
type Role = { id: string; name: string; isAdmin: boolean };
type Resource = { id: string; type: "service" | "tool" | "skill"; visibility: "public" | "restricted"; parentId: string | null; name: string; description: string };
type ApiKey = { id: string; userId?: string; name: string; value: string; expiresAt: string | null; revokedAt: string | null; createdAt: string };
type SessionUser = { id: string; username: string; isAdmin: boolean };
type View = "overview" | "users" | "roles" | "keys" | "services";

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<{ title: string; value: string } | null>(null);
  const [keyOwner, setKeyOwner] = useState<string | null>(null);

  useEffect(() => {
    void api<{ user: SessionUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setView("overview");
  };

  if (loading) return <div className="screen-state">正在连接本地实例…</div>;
  if (!user) {
    return (
      <Login
        onLogin={(loggedIn) => {
          setUser(loggedIn);
          setError("");
        }}
      />
    );
  }

  const navigation = user.isAdmin
    ? [
        { id: "overview" as const, label: "概览", icon: Activity },
        { id: "services" as const, label: "MCP 服务", icon: Boxes },
        { id: "users" as const, label: "用户", icon: Users },
        { id: "roles" as const, label: "角色与授权", icon: Shield },
        { id: "keys" as const, label: "API Keys", icon: KeyRound },
      ]
    : [
        { id: "overview" as const, label: "概览", icon: Activity },
        { id: "keys" as const, label: "API Keys", icon: KeyRound },
      ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Boxes size={18} /></div>
          <div className="brand-copy"><strong>Agent Hub</strong><span>能力中台</span></div>
        </div>
        <div className="sidebar-rule" />
        <div className="nav-label">工作区</div>
        <nav className="navigation" aria-label="主导航">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => { if (id === "keys") setKeyOwner(user.id); setView(id); setError(""); }}>
              <Icon size={16} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="instance-dot" />SQLite 本地实例</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">控制台 <span>/</span> {navigation.find((item) => item.id === view)?.label}</div>
          <div className="account-actions"><span className="account-name"><UserRound size={15} />{user.username}</span><button className="text-button" onClick={() => void logout()}><LogOut size={15} />退出</button></div>
        </header>
        {error && <div className="notice error-notice" role="alert">{error}<button aria-label="关闭提示" onClick={() => setError("")}><X size={15} /></button></div>}
        <div className="page-content" key={view}>
          {view === "overview" && <Overview user={user} onPasswordChanged={() => setUser(null)} />}
          {view === "services" && user.isAdmin && <ServicesPage setError={setError} />}
          {view === "users" && user.isAdmin && <UsersPage setError={setError} onReveal={setReveal} onOpenKeys={(userId) => { setKeyOwner(userId); setView("keys"); }} />}
          {view === "roles" && user.isAdmin && <RolesPage setError={setError} />}
          {view === "keys" && <KeysPage user={user} ownerId={keyOwner ?? user.id} setError={setError} onReveal={setReveal} />}
        </div>
      </main>
      {reveal && <SecretDialog title={reveal.title} value={reveal.value} onClose={() => setReveal(null)} />}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
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
      <section className="login-panel">
        <div className="login-brand"><div className="brand-mark"><Boxes size={19} /></div><div><strong>Agent Hub</strong><span>能力中台</span></div></div>
        <h1>登录控制台</h1>
        <p className="section-description">使用部署者提供的账号和密码继续。</p>
        <form className="form-stack login-form" onSubmit={(event) => void submit(event)}>
          <label>账号<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button" disabled={submitting}>{submitting ? "正在登录…" : "登录"}</button>
        </form>
        <div className="login-footnote"><span className="instance-dot" />自托管单实例</div>
      </section>
    </main>
  );
}

function Overview({ user, onPasswordChanged }: { user: SessionUser; onPasswordChanged: () => void }) {
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  useEffect(() => {
    void Promise.all([
      api<{ status: string; database: string }>("/api/health").then(setHealth).catch(() => setHealth({ status: "error", database: "unavailable" })),
      api<{ keys: ApiKey[] }>("/api/keys").then((result) => setKeys(result.keys)).catch(() => setKeys([])),
    ]);
  }, [refreshToken]);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    try {
      await api<void>("/api/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      onPasswordChanged();
    } catch (reason) { setPasswordMessage(reason instanceof Error ? reason.message : "修改密码失败"); }
  };

  return (
    <section>
      <div className="section-heading">
        <div><p className="eyebrow">平台概览</p><h1>欢迎，{user.username}</h1><p className="section-description">{user.isAdmin ? "管理本地用户、角色授權与 API 凭证。" : "管理你的 Agent API 凭证。"}</p></div>
        <button className="icon-button" onClick={() => setRefreshToken((value) => value + 1)} aria-label="刷新状态" title="刷新状态"><RefreshCw size={16} /></button>
      </div>
      <div className="summary-grid">
        <div className="summary-item"><span className="summary-label">API 服务</span><strong className={health?.status === "ok" ? "good-text" : "bad-text"}>{health?.status === "ok" ? "运行正常" : "检查中"}</strong><small>Express · 本地服务</small></div>
        <div className="summary-item"><span className="summary-label">数据库</span><strong className={health?.database === "ok" ? "good-text" : "bad-text"}>{health?.database === "ok" ? "SQLite 已连接" : "不可用"}</strong><small>单实例持久化</small></div>
        <div className="summary-item"><span className="summary-label">你的 API Keys</span><strong>{keys.filter((key) => !key.revokedAt).length}</strong><small>已签发凭证</small></div>
      </div>
      <div className="section-subheading"><div><h2>当前阶段</h2><p>资源目录使用 demo 条目验证角色可见性，暂不执行 MCP 工具。</p></div></div>
      <div className="service-list">
        <div className="service-row"><div className="service-icon api-icon">MCP</div><div className="service-info"><strong>Demo MCP Service</strong><span>工具与下游调用将在后续阶段接入</span></div><span className="state-label">目录占位</span></div>
        <div className="service-row"><div className="service-icon skills-icon">SK</div><div className="service-info"><strong>Skills 条目</strong><span>公共与角色授权条目占位</span></div><span className="state-label">目录占位</span></div>
      </div>
      <div className="section-subheading password-section"><div><h2>修改密码</h2><p>修改后当前账号的所有网页会话都会退出。</p></div></div>
      <form className="inline-create password-form" onSubmit={(event) => void changePassword(event)}><label>当前密码<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>新密码<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><button className="primary-button">更新密码</button>{passwordMessage && <span className="form-error">{passwordMessage}</span>}</form>
    </section>
  );
}

function UsersPage({ setError, onReveal, onOpenKeys }: { setError: (error: string) => void; onReveal: (secret: { title: string; value: string }) => void; onOpenKeys: (userId: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [username, setUsername] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [userResult, roleResult] = await Promise.all([api<{ users: User[] }>("/api/admin/users"), api<{ roles: Role[] }>("/api/admin/roles")]);
      setUsers(userResult.users);
      setRoles(roleResult.roles.filter((role) => !role.isAdmin));
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法加载用户"); }
  }, [setError]);
  useEffect(() => { void load(); }, [load]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ user: User; initialPassword: string }>("/api/admin/users", { method: "POST", body: JSON.stringify({ username, roleIds: selectedRoles }) });
      setUsername("");
      setSelectedRoles([]);
      onReveal({ title: `用户 ${result.user.username} 的初始密码`, value: result.initialPassword });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建用户失败"); }
    finally { setBusy(false); }
  };

  const toggleActive = async (user: User) => {
    try { await api<void>(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "更新用户失败"); }
  };

  const resetPassword = async (user: User) => {
    try {
      const result = await api<{ newPassword: string }>(`/api/admin/users/${user.id}/password`, { method: "POST" });
      onReveal({ title: `用户 ${user.username} 的新密码`, value: result.newPassword });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "重置密码失败"); }
  };

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  return (
    <section>
      <div className="section-heading"><div><p className="eyebrow">访问管理</p><h1>用户</h1><p className="section-description">创建本地账号，分配一个或多个访问角色。</p></div><button className="icon-button" onClick={() => void load()} aria-label="刷新用户" title="刷新"><RefreshCw size={16} /></button></div>
      <form className="inline-create" onSubmit={(event) => void createUser(event)}>
        <label className="field-grow">账号<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
        <fieldset className="role-picker"><legend>分配角色</legend>{roles.map((role) => <label key={role.id} className="check-option"><input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={(event) => setSelectedRoles((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))} />{role.name}</label>)}{roles.length === 0 && <span className="muted">先创建一个角色</span>}</fieldset>
        <button className="primary-button" disabled={busy || !roles.length}><Plus size={15} />创建用户</button>
      </form>
      <div className="table-wrap"><table><thead><tr><th>账号</th><th>角色</th><th>状态</th><th className="actions-heading">操作</th></tr></thead><tbody>
        {users.map((entry) => <tr key={entry.id}><td><strong>{entry.username}</strong>{entry.isAdmin && <span className="role-tag admin-tag">管理员</span>}</td><td>{entry.isAdmin ? "固定管理员角色" : <><span>{entry.roleIds.map((id) => roleNames.get(id) ?? "已删除角色").join("、")}</span><RoleAssignment user={entry} roles={roles} onSaved={load} setError={setError} /></>}</td><td><span className={`status-pill ${entry.active ? "enabled" : "disabled"}`}>{entry.active ? "启用" : "停用"}</span></td><td className="row-actions">{!entry.isAdmin && <><button className="quiet-button" onClick={() => void resetPassword(entry)}>重置密码</button><button className="quiet-button" onClick={() => onOpenKeys(entry.id)}>Keys</button><button className="quiet-button" onClick={() => void toggleActive(entry)}>{entry.active ? "停用" : "启用"}</button></>}</td></tr>)}
        {!users.length && <tr><td colSpan={4} className="empty-cell">暂无用户</td></tr>}
      </tbody></table></div>
    </section>
  );
}

function RoleAssignment({ user, roles, onSaved, setError }: { user: User; roles: Role[]; onSaved: () => Promise<void>; setError: (error: string) => void }) {
  const [selected, setSelected] = useState(user.roleIds);
  useEffect(() => setSelected(user.roleIds), [user.roleIds]);
  const save = async () => {
    try {
      await api(`/api/admin/users/${user.id}/roles`, { method: "PUT", body: JSON.stringify({ roleIds: selected }) });
      await onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "更新角色失败"); }
  };
  return <details className="role-editor"><summary>编辑</summary><div className="role-editor-menu">{roles.map((role) => <label key={role.id} className="check-option"><input type="checkbox" checked={selected.includes(role.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))} />{role.name}</label>)}<button className="quiet-button" onClick={() => void save()}>保存角色</button></div></details>;
}

function RolesPage({ setError }: { setError: (error: string) => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [grants, setGrants] = useState<string[]>([]);
  const [roleName, setRoleName] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [roleResult, resourceResult] = await Promise.all([api<{ roles: Role[] }>("/api/admin/roles"), api<{ resources: Resource[] }>("/api/admin/resources")]);
      const customRoles = roleResult.roles.filter((role) => !role.isAdmin);
      setRoles(customRoles);
      setResources(resourceResult.resources);
      setSelectedRole((current) => customRoles.some((role) => role.id === current) ? current : customRoles[0]?.id ?? "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法加载角色"); }
  }, [setError]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedRole) { setGrants([]); return; }
    void api<{ resourceIds: string[] }>(`/api/admin/roles/${selectedRole}/resources`).then((result) => setGrants(result.resourceIds)).catch(() => setGrants([]));
  }, [selectedRole]);

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await api<{ role: Role }>("/api/admin/roles", { method: "POST", body: JSON.stringify({ name: roleName }) });
      setRoleName("");
      await load();
      setSelectedRole(result.role.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建角色失败"); }
  };
  const saveGrants = async () => {
    setSaving(true);
    try { await api(`/api/admin/roles/${selectedRole}/resources`, { method: "PUT", body: JSON.stringify({ resourceIds: grants }) }); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "保存授权失败"); }
    finally { setSaving(false); }
  };
  const deleteRole = async () => {
    if (!selectedRole) return;
    try {
      await api<void>(`/api/admin/roles/${selectedRole}`, { method: "DELETE" });
      setSelectedRole("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "删除角色失败"); }
  };
  const toggleGrant = (resourceId: string) => setGrants((current) => current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]);

  return (
    <section>
      <div className="section-heading"><div><p className="eyebrow">授权策略</p><h1>角色与资源</h1><p className="section-description">允许的资源同时对用户可见；未授权资源默认隐藏。</p></div><button className="icon-button" onClick={() => void load()} aria-label="刷新角色" title="刷新"><RefreshCw size={16} /></button></div>
      <form className="inline-create role-create" onSubmit={(event) => void createRole(event)}><label className="field-grow">新角色名称<input value={roleName} onChange={(event) => setRoleName(event.target.value)} required /></label><button className="primary-button"><Plus size={15} />创建角色</button></form>
      <div className="role-layout">
        <nav className="role-list" aria-label="角色列表">{roles.map((role) => <button key={role.id} className={`role-nav-item ${selectedRole === role.id ? "selected" : ""}`} onClick={() => setSelectedRole(role.id)}><Shield size={15} />{role.name}</button>)}{!roles.length && <p className="muted role-empty">暂无自定义角色</p>}</nav>
        <div className="grant-panel">
          <div className="subsection-heading"><div><h2>{roles.find((role) => role.id === selectedRole)?.name ?? "资源授权"}</h2><p>Demo 资源仅用于验证授权，不会执行调用。</p></div><div className="button-row"><button className="icon-button danger-icon" onClick={() => void deleteRole()} disabled={!selectedRole} aria-label="删除角色" title="删除角色"><Trash2 size={15} /></button><button className="primary-button" onClick={() => void saveGrants()} disabled={!selectedRole || saving}>{saving ? "保存中…" : "保存授权"}</button></div></div>
          <ResourceGroup title="MCP 服务与工具" resources={resources.filter((resource) => resource.type !== "skill")} grants={grants} onToggle={toggleGrant} />
          <ResourceGroup title="Agent Plugins / Skills" resources={resources.filter((resource) => resource.type === "skill")} grants={grants} onToggle={toggleGrant} />
        </div>
      </div>
    </section>
  );
}

function ResourceGroup({ title, resources, grants, onToggle }: { title: string; resources: Resource[]; grants: string[]; onToggle: (id: string) => void }) {
  return <div className="resource-group"><h3>{title}</h3>{resources.map((resource) => <label key={resource.id} className="resource-row"><input type="checkbox" checked={resource.visibility === "public" || grants.includes(resource.id)} disabled={resource.visibility === "public"} onChange={() => onToggle(resource.id)} /><span className="resource-type">{resource.type === "service" ? "服务" : resource.type === "tool" ? "工具" : resource.visibility === "public" ? "始终公开" : "特殊"}</span><span className="resource-copy"><strong>{resource.name}</strong><small>{resource.description}</small></span></label>)}{!resources.length && <p className="muted">暂无资源</p>}</div>;
}

function KeysPage({ user, ownerId, setError, onReveal }: { user: SessionUser; ownerId: string; setError: (error: string) => void; onReveal: (secret: { title: string; value: string }) => void }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [ownerName, setOwnerName] = useState(user.username);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("choose");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const targetUrl = user.isAdmin && ownerId !== user.id ? `/api/admin/users/${ownerId}/keys` : "/api/keys";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ keys: ApiKey[] }>(targetUrl);
      setKeys(result.keys);
      if (user.isAdmin && ownerId !== user.id) {
        const users = await api<{ users: User[] }>("/api/admin/users");
        setOwnerName(users.users.find((entry) => entry.id === ownerId)?.username ?? "用户");
      } else setOwnerName(user.username);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法加载 API Keys"); }
    finally { setLoading(false); }
  }, [ownerId, setError, targetUrl, user.id, user.isAdmin, user.username]);
  useEffect(() => { void load(); }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (expiry === "choose") { setError("请选择过期时间或永久有效"); return; }
    const path = user.isAdmin && ownerId !== user.id ? `/api/admin/users/${ownerId}/keys` : "/api/keys";
    try {
      const result = await api<{ key: ApiKey }>(path, { method: "POST", body: JSON.stringify({ name, expiresAt: expiry === "permanent" ? null : new Date(expiresAt).toISOString() }) });
      setName("");
      setExpiry("choose");
      setExpiresAt("");
      onReveal({ title: `API Key：${result.key.name}`, value: result.key.value });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建 API Key 失败"); }
  };
  const revoke = async (key: ApiKey) => {
    try { await api<void>(`/api/keys/${key.id}`, { method: "DELETE" }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "吊销 Key 失败"); }
  };

  return (
    <section>
      <div className="section-heading"><div><p className="eyebrow">凭证管理</p><h1>{ownerId === user.id ? "API Keys" : `${ownerName} · API Keys`}</h1><p className="section-description">Bearer 凭证用于只读 demo 资源接口；明文保存在本地数据库，可重复复制。</p></div><button className="icon-button" onClick={() => void load()} aria-label="刷新 Keys" title="刷新"><RefreshCw size={16} /></button></div>
      <form className="inline-create key-create" onSubmit={(event) => void create(event)}>
        <label className="field-grow">名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：本地 Codex" required /></label>
        <label>有效期<select value={expiry} onChange={(event) => setExpiry(event.target.value)} required><option value="choose" disabled>请选择</option><option value="permanent">永久有效</option><option value="date">设置到期时间</option></select></label>
        {expiry === "date" && <label>到期时间<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required /></label>}
        <button className="primary-button"><Plus size={15} />创建 Key</button>
      </form>
      <div className="table-wrap"><table><thead><tr><th>名称</th><th>Key</th><th>有效期</th><th>状态</th><th className="actions-heading">操作</th></tr></thead><tbody>
        {keys.map((key) => { const expired = key.expiresAt !== null && key.expiresAt <= new Date().toISOString(); const active = !key.revokedAt && !expired; return <tr key={key.id}><td><strong>{key.name}</strong></td><td><code className="key-preview">{key.value.slice(0, 12)}…</code></td><td>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : "永久"}</td><td><span className={`status-pill ${active ? "enabled" : "disabled"}`}>{key.revokedAt ? "已吊销" : expired ? "已过期" : "有效"}</span></td><td className="row-actions"><button className="icon-button small-icon" onClick={() => onReveal({ title: `API Key：${key.name}`, value: key.value })} aria-label={`复制 ${key.name}`} title="复制 Key"><Copy size={14} /></button>{active && <button className="quiet-button danger-action" onClick={() => void revoke(key)}>吊销</button>}</td></tr>; })}
        {!loading && !keys.length && <tr><td colSpan={5} className="empty-cell">暂无 API Key</td></tr>}
      </tbody></table></div>
    </section>
  );
}

function SecretDialog({ title, value, onClose }: { title: string; value: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="secret-dialog" role="dialog" aria-modal="true" aria-labelledby="secret-title"><div className="dialog-heading"><div><p className="eyebrow">请安全保存</p><h2 id="secret-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={16} /></button></div><p className="section-description">凭证保存在本地 SQLite 中，可之后再次复制。请通过安全渠道交付。</p><div className="secret-value"><code>{value}</code><button className="icon-button" onClick={() => void copy()} aria-label="复制凭证" title="复制"><Copy size={15} /></button></div><button className="primary-button dialog-done" onClick={onClose}>{copied ? <Check size={15} /> : null}{copied ? "已复制，完成" : "完成"}</button></section></div>;
}
