import { useCallback, useEffect, useRef, useState } from "react";
import { api, isAbortError } from "../lib/api";

export interface HealthState {
  status: "loading" | "ok" | "error";
  database: "loading" | "ok" | "unavailable";
}

/** Shared health status hook consumed by both AppShell sidebar and OverviewPage. */
export function useHealth(enabled: boolean) {
  const [health, setHealth] = useState<HealthState>({ status: "loading", database: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    try {
      const result = await api<{ status: string; database: string }>("/api/health", {
        signal: controller.signal,
      });
      setHealth({
        status: result.status === "ok" ? "ok" : "error",
        database: result.database === "ok" ? "ok" : "unavailable",
      });
    } catch (reason) {
      if (isAbortError(reason)) return;
      setHealth({ status: "error", database: "unavailable" });
    } finally {
      if (controllerRef.current === controller) {
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort();
      setHealth({ status: "loading", database: "loading" });
      return;
    }
    void refresh();
    return () => controllerRef.current?.abort();
  }, [enabled, refresh]);

  return { health, refreshing, refresh };
}
