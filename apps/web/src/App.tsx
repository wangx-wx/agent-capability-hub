import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, setUnauthorizedHandler } from "./lib/api";
import { useHashRoute } from "./lib/router";
import { useHealth } from "./hooks/useHealth";
import { Toaster, TooltipProvider } from "./components/ui";
import { AppShell, type BreadcrumbItem } from "./components/layout/AppShell";
import { SecretDialog } from "./components/SecretDialog";
import { PasswordModal } from "./components/domain/PasswordModal";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ServicesPage } from "./pages/ServicesPage";
import { AuditPage } from "./pages/AuditPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { KeysPage } from "./pages/KeysPage";
import type { SecretReveal, SessionUser } from "./types";

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState<SecretReveal | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [managedKeyOwnerName, setManagedKeyOwnerName] = useState<string | null>(null);

  const userRef = useRef<SessionUser | null>(null);
  userRef.current = user;

  const { route, navigate } = useHashRoute(Boolean(user?.isAdmin), !loading && Boolean(user));
  const { health, refreshing: healthRefreshing, refresh: refreshHealth } = useHealth(Boolean(user));

  const resetSessionState = useCallback(() => {
    setUser(null);
    setReveal(null);
    setPasswordModalOpen(false);
    setManagedKeyOwnerName(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (userRef.current) {
        toast.error("登录状态已失效，请重新登录");
      }
      resetSessionState();
    });
    return () => setUnauthorizedHandler(null);
  }, [resetSessionState]);

  useEffect(() => {
    void api<{ user: SessionUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    resetSessionState();
  };

  const breadcrumbs = useMemo<BreadcrumbItem[] | undefined>(() => {
    if (user?.isAdmin && route.view === "keys" && route.keyOwnerId && route.keyOwnerId !== user.id) {
      return [
        { label: "用户", onClick: () => navigate("users") },
        { label: managedKeyOwnerName ?? "…" },
        { label: "API Keys" },
      ];
    }
    return undefined;
  }, [user, route.view, route.keyOwnerId, managedKeyOwnerName, navigate]);

  return (
    <TooltipProvider>
      <Toaster />
      {loading ? (
        <div className="min-h-screen grid place-items-center bg-[#F5F6F8] text-[13px] text-[#4B5563]">
          正在连接本地实例…
        </div>
      ) : !user ? (
        <LoginPage
          onLogin={(loggedIn) => {
            setUser(loggedIn);
          }}
        />
      ) : (
        <>
          <AppShell
            user={user}
            view={route.view}
            health={health}
            error=""
            breadcrumbs={breadcrumbs}
            onSelectView={(nextView) => navigate(nextView)}
            onClearError={() => undefined}
            onOpenPasswordModal={() => setPasswordModalOpen(true)}
            onLogout={() => void logout()}
          >
            {route.view === "overview" && (
              <OverviewPage
                user={user}
                health={health}
                healthRefreshing={healthRefreshing}
                onRefreshHealth={refreshHealth}
                onNavigate={(nextView) => navigate(nextView)}
              />
            )}
            {route.view === "services" && <ServicesPage isAdmin={user.isAdmin} />}
            {route.view === "audit" && <AuditPage />}
            {route.view === "users" && user.isAdmin && (
              <UsersPage
                currentUserId={user.id}
                onReveal={setReveal}
                onOpenKeys={(userId) => navigate("keys", userId)}
                onNavigateRoles={() => navigate("roles")}
              />
            )}
            {route.view === "roles" && user.isAdmin && <RolesPage />}
            {route.view === "keys" && (
              <KeysPage
                user={user}
                ownerId={route.keyOwnerId ?? user.id}
                onReveal={setReveal}
                onBackToUsers={() => navigate("users")}
                onSwitchToMine={() => navigate("keys")}
                onOwnerResolved={setManagedKeyOwnerName}
              />
            )}
          </AppShell>

          <PasswordModal
            open={passwordModalOpen}
            onOpenChange={setPasswordModalOpen}
            onSuccess={resetSessionState}
          />

          {reveal && (
            <SecretDialog
              open
              kind={reveal.kind}
              title={reveal.title}
              value={reveal.value}
              onClose={() => setReveal(null)}
            />
          )}
        </>
      )}
    </TooltipProvider>
  );
}
