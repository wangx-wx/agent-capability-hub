import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

type Health = {
  status: "ok" | "error";
  database: "ok" | "unavailable";
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);

  const loadHealth = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/health");
      const result = (await response.json()) as Health;
      setHealth(result);
    } catch {
      setHealth({ status: "error", database: "unavailable" });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const ready = health?.status === "ok";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-hidden="true">
          <Activity size={18} strokeWidth={2.2} />
        </div>
        <div className="brand-copy">
          <strong>Agent Hub</strong>
          <span>控制台</span>
        </div>
        <div className="sidebar-rule" />
        <div className="nav-label">系统</div>
        <div className="nav-item active">
          <Activity size={16} />
          <span>服务状态</span>
        </div>
        <div className="sidebar-footer">自托管实例</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">控制台 <span>/</span> 概览</div>
          <div className="instance-label"><span className="instance-dot" /> 本地实例</div>
        </header>

        <section className="status-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">平台概览</p>
              <h1>服务状态</h1>
              <p className="section-description">查看中台 API 与本地数据库连接状态。</p>
            </div>
            <button className="icon-button" onClick={() => void loadHealth()} disabled={checking} aria-label="刷新状态" title="刷新状态">
              <RefreshCw size={16} className={checking ? "spin" : ""} />
            </button>
          </div>

          <div className="service-list" aria-live="polite">
            <div className="service-row">
              <div className="service-icon api-icon">API</div>
              <div className="service-info">
                <strong>中台 API</strong>
                <span>Express 服务 · 127.0.0.1:3100</span>
              </div>
              <div className={`service-state ${ready ? "is-ready" : health ? "is-error" : "is-pending"}`}>
                <span className="state-dot" />
                {checking ? "检查中" : ready ? "运行正常" : "不可用"}
              </div>
            </div>
            <div className="service-row">
              <div className="service-icon db-icon">DB</div>
              <div className="service-info">
                <strong>应用数据库</strong>
                <span>SQLite · 本地持久化</span>
              </div>
              <div className={`service-state ${health?.database === "ok" ? "is-ready" : health ? "is-error" : "is-pending"}`}>
                <span className="state-dot" />
                {checking ? "检查中" : health?.database === "ok" ? "已连接" : "不可用"}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
