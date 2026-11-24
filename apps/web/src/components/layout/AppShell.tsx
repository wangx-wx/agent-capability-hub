import { useState, type ReactNode } from "react";
import {
  Boxes,
  ChevronDown,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  ScrollText,
  Server,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { HealthState } from "../../hooks/useHealth";
import type { SessionUser, ViewId } from "../../types";
import {
  Badge,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  cn,
} from "../ui";

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof LayoutGrid;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface AppShellProps {
  user: SessionUser;
  view: ViewId;
  health: HealthState;
  error: string;
  breadcrumbs?: BreadcrumbItem[];
  onSelectView: (view: ViewId) => void;
  onClearError: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  children: ReactNode;
}

function SidebarContent({
  navGroups,
  view,
  health,
  onSelect,
}: {
  navGroups: NavGroup[];
  view: ViewId;
  health: HealthState;
  onSelect: (id: ViewId) => void;
}) {
  const dotClass =
    health.status === "ok" && health.database === "ok"
      ? "bg-[#15803D]"
      : health.status === "loading"
        ? "bg-[#B45309] ach-pulse"
        : "bg-[#B91C1C]";
  const healthLabel =
    health.status === "ok" && health.database === "ok"
      ? "SQLite 实例 · 正常"
      : health.status === "loading"
        ? "正在检查实例…"
        : "实例连接异常";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-2 pb-4 border-b border-[#E2E5EC]">
        <span
          aria-hidden="true"
          className="inline-grid place-items-center h-8 w-8 rounded-[var(--radius-sm)] bg-[#18181B] text-white shrink-0"
        >
          <Boxes size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-tight text-[#111827] leading-tight">
            Agent Hub
          </div>
          <div className="text-[12px] text-[#5B6270] leading-tight">能力中台</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-5" aria-label="主导航">
        {navGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <div className="px-2.5 pb-1 text-[12px] font-medium text-[#5B6270]">
              {group.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(id)}
                    className={cn(
                      "w-full h-9 px-2.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium text-left cursor-pointer",
                      "transition-[background-color,color] duration-150",
                      active
                        ? "bg-[#EFF6FF] text-[#1D4ED8]"
                        : "text-[#4B5563] hover:bg-[#EEF0F4] hover:text-[#111827]",
                    )}
                  >
                    <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-3 px-2.5 border-t border-[#E2E5EC] flex items-center gap-2 text-[12px] text-[#4B5563]">
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
        <span className="truncate">{healthLabel}</span>
      </div>
    </div>
  );
}

/** Responsive workspace shell with sticky sidebar, mobile drawer nav, topbar, and account menu. */
export function AppShell({
  user,
  view,
  health,
  error,
  breadcrumbs,
  onSelectView,
  onClearError,
  onOpenPasswordModal,
  onLogout,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const trail = breadcrumbs ?? [
    { label: "控制台", onClick: () => onSelectView("overview") },
    { label: currentLabel },
  ];

  const handleSelect = (nextView: ViewId) => {
    setMobileOpen(false);
    onSelectView(nextView);
  };

  return (
    <div className="min-h-screen flex bg-[#F5F6F8] text-[#111827]">
      <aside className="hidden min-[769px]:flex flex-col w-[232px] shrink-0 sticky top-0 h-screen bg-white border-r border-[#E2E5EC] px-3.5 py-4">
        <SidebarContent navGroups={navGroups} view={view} health={health} onSelect={handleSelect} />
      </aside>

      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        side="left"
        size="sm"
        title="工作区导航"
        className="px-4 py-4"
      >
        <SidebarContent navGroups={navGroups} view={view} health={health} onSelect={handleSelect} />
      </Drawer>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[52px] sticky top-0 z-30 flex items-center justify-between gap-4 px-8 max-[768px]:px-4 bg-[#F5F6F8]/85 backdrop-blur-md border-b border-[#E2E5EC]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex min-[769px]:hidden">
              <IconButton
                size="sm"
                variant="secondary"
                aria-label="打开导航"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={16} strokeWidth={1.75} />
              </IconButton>
            </span>

            <nav aria-label="面包屑" className="flex items-center gap-2 text-[13px] min-w-0">
              {trail.map((item, index) => {
                const isLast = index === trail.length - 1;
                return (
                  <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2 min-w-0">
                    {index > 0 && <span className="text-[#CBD2DF]">/</span>}
                    {item.onClick && !isLast ? (
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="text-[#4B5563] hover:text-[#111827] transition-colors truncate cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          isLast ? "font-medium text-[#111827]" : "text-[#4B5563]",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Badge tone={user.isAdmin ? "info" : "neutral"} className="max-[768px]:hidden">
              {user.isAdmin ? "管理员" : "普通用户"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="账号菜单"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] border border-[#E2E5EC] bg-white text-[13px] font-medium text-[#111827] shadow-[var(--shadow-xs)] hover:bg-[#EEF0F4] transition-colors cursor-pointer"
                >
                  <UserRound size={15} strokeWidth={1.75} className="text-[#4B5563]" />
                  <span className="max-w-[140px] truncate">{user.username}</span>
                  <ChevronDown size={14} strokeWidth={1.75} className="text-[#5B6270]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onOpenPasswordModal}>
                  <Lock size={14} strokeWidth={1.75} />
                  <span>修改密码</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={onLogout}>
                  <LogOut size={14} strokeWidth={1.75} />
                  <span>退出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-8 pt-6 pb-14 max-[768px]:px-4 max-[768px]:pt-4 max-[768px]:pb-10">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-[13px]"
            >
              <span>{error}</span>
              <button
                type="button"
                aria-label="关闭提示"
                onClick={onClearError}
                className="inline-grid place-items-center h-6 w-6 rounded hover:bg-[#FEE2E2] cursor-pointer"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          )}

          <div key={view}>{children}</div>
        </main>
      </div>
    </div>
  );
}
