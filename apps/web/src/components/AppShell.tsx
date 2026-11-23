import type { ReactNode } from "react";
import {
  Boxes,
  KeyRound,
  LayoutGrid,
  LogOut,
  ScrollText,
  Server,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { SessionUser, ViewId } from "../types";

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof LayoutGrid;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface AppShellProps {
  user: SessionUser;
  view: ViewId;
  error: string;
  onSelectView: (view: ViewId) => void;
  onClearError: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({
  user,
  view,
  error,
  onSelectView,
  onClearError,
  onLogout,
  children,
}: AppShellProps) {
  const navGroups: NavGroup[] = user.isAdmin
    ? [
        {
          title: "工作区",
          items: [{ id: "overview", label: "概览", icon: LayoutGrid }],
        },
        {
          title: "能力接入",
          items: [
            { id: "services", label: "MCP 服务", icon: Server },
            { id: "audit", label: "调用审计", icon: ScrollText },
          ],
        },
        {
          title: "访问控制",
          items: [
            { id: "users", label: "用户", icon: Users },
            { id: "roles", label: "角色与授权", icon: Shield },
            { id: "keys", label: "API Keys", icon: KeyRound },
          ],
        },
      ]
    : [
        {
          title: "工作区",
          items: [
            { id: "overview", label: "概览", icon: LayoutGrid },
            { id: "keys", label: "API Keys", icon: KeyRound },
          ],
        },
      ];

  const allItems = navGroups.flatMap((group) => group.items);
  const currentLabel = allItems.find((item) => item.id === view)?.label ?? "概览";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">
            <Boxes size={20} strokeWidth={1.5} />
          </span>
          <div className="brand-copy">
            <strong>Agent Hub</strong>
            <span>能力中台</span>
          </div>
        </div>

        <nav className="nav-groups" aria-label="主导航">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-label">{group.title}</div>
              <div className="navigation">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`nav-item ${view === id ? "active" : ""}`}
                    onClick={() => onSelectView(id)}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="instance-dot" />
          <span>SQLite 本地实例</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>控制台</span>
            <span className="breadcrumb-sep">/</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="account-actions">
            <span className="account-name">
              <UserRound size={15} strokeWidth={1.5} />
              <span>{user.username}</span>
            </span>
            <button type="button" className="text-button" onClick={onLogout}>
              <LogOut size={15} strokeWidth={1.5} />
              <span>退出</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="notice error-notice" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="关闭提示" onClick={onClearError}>
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div className="page-content" key={view}>
          {children}
        </div>
      </main>
    </div>
  );
}
