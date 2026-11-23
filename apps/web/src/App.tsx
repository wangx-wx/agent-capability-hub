import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { AppShell } from "./components/AppShell";
import { SecretDialog } from "./components/SecretDialog";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ServicesPage } from "./pages/ServicesPage";
import { AuditPage } from "./pages/AuditPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { KeysPage } from "./pages/KeysPage";
import type { SecretReveal, SessionUser, ViewId } from "./types";

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<ViewId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<SecretReveal | null>(null);
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

  if (loading) {
    return <div className="screen-state">正在连接本地实例…</div>;
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={(loggedIn) => {
          setUser(loggedIn);
          setError("");
        }}
      />
    );
  }

  return (
    <>
      <AppShell
        user={user}
        view={view}
        error={error}
        onSelectView={(nextView) => {
          if (nextView === "keys") setKeyOwner(user.id);
          setView(nextView);
          setError("");
        }}
        onClearError={() => setError("")}
        onLogout={() => void logout()}
      >
        {view === "overview" && (
          <OverviewPage user={user} onPasswordChanged={() => setUser(null)} />
        )}
        {view === "services" && user.isAdmin && <ServicesPage setError={setError} />}
        {view === "audit" && user.isAdmin && <AuditPage />}
        {view === "users" && user.isAdmin && (
          <UsersPage
            setError={setError}
            onReveal={setReveal}
            onOpenKeys={(userId) => {
              setKeyOwner(userId);
              setView("keys");
            }}
          />
        )}
        {view === "roles" && user.isAdmin && <RolesPage setError={setError} />}
        {view === "keys" && (
          <KeysPage
            user={user}
            ownerId={keyOwner ?? user.id}
            setError={setError}
            onReveal={setReveal}
          />
        )}
      </AppShell>

      {reveal && (
        <SecretDialog title={reveal.title} value={reveal.value} onClose={() => setReveal(null)} />
      )}
    </>
  );
}
