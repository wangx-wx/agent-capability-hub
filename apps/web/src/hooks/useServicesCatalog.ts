import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api, errorMessage, isAbortError } from "../lib/api";
import type { SyncPreview } from "../components/domain/SyncPreviewModal";
import type { RegisteredTool, Service } from "../types";

export type KindFilter = "all" | "mcp" | "rest";
export type StatusFilter = "all" | "enabled" | "disabled" | "error";

export interface SyncModalState {
  open: boolean;
  serviceId: string;
  preview: SyncPreview | null;
  busy: boolean;
  staleError: boolean;
  error: string;
}

const INITIAL_SYNC_MODAL: SyncModalState = {
  open: false,
  serviceId: "",
  preview: null,
  busy: false,
  staleError: false,
  error: "",
};

/** Encapsulates service list, tool loading with AbortController, filters, and CRUD/sync actions. */
export function useServicesCatalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshingList, setRefreshingList] = useState(false);
  const [listError, setListError] = useState("");

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [drawerBusyAction, setDrawerBusyAction] = useState<"sync" | "connect" | "toggle" | null>(null);
  const [syncModal, setSyncModal] = useState<SyncModalState>(INITIAL_SYNC_MODAL);

  const listAbortRef = useRef<AbortController | null>(null);
  const toolsAbortRef = useRef<AbortController | null>(null);

  const loadServices = useCallback(async (keepSelectedId?: string | null) => {
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    setRefreshingList(true);
    try {
      const result = await api<{ services: Service[] }>("/api/admin/services", {
        signal: controller.signal,
      });
      setServices(result.services);
      setListError("");
      if (keepSelectedId) {
        setSelectedId(result.services.some((s) => s.id === keepSelectedId) ? keepSelectedId : null);
      }
    } catch (reason) {
      if (isAbortError(reason)) return;
      setListError(errorMessage(reason));
    } finally {
      if (listAbortRef.current === controller) {
        setLoadingList(false);
        setRefreshingList(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadServices();
    return () => listAbortRef.current?.abort();
  }, [loadServices]);

  const loadToolsFor = useCallback(async (serviceId: string | null) => {
    toolsAbortRef.current?.abort();
    if (!serviceId) {
      setTools([]);
      setLoadingTools(false);
      return;
    }
    const controller = new AbortController();
    toolsAbortRef.current = controller;
    setLoadingTools(true);
    try {
      const result = await api<{ tools: RegisteredTool[] }>(
        `/api/admin/services/${serviceId}/tools`,
        { signal: controller.signal },
      );
      setTools(result.tools);
    } catch (reason) {
      if (isAbortError(reason)) return;
      toast.error(errorMessage(reason));
    } finally {
      if (toolsAbortRef.current === controller) {
        setLoadingTools(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadToolsFor(selectedId);
    return () => toolsAbortRef.current?.abort();
  }, [selectedId, loadToolsFor]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedId) ?? null,
    [services, selectedId],
  );

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((service) => {
      if (kindFilter !== "all" && service.kind !== kindFilter) return false;
      if (statusFilter === "enabled" && !service.enabled) return false;
      if (statusFilter === "disabled" && service.enabled) return false;
      if (
        statusFilter === "error" &&
        (!service.enabled ||
          (service.kind === "mcp" && service.connectionStatus === "connected") ||
          service.kind === "rest")
      ) {
        return false;
      }
      if (!q) return true;
      return (
        service.name.toLowerCase().includes(q) ||
        service.namespace.toLowerCase().includes(q) ||
        service.url.toLowerCase().includes(q) ||
        service.description.toLowerCase().includes(q)
      );
    });
  }, [services, search, kindFilter, statusFilter]);

  const toggleEnabled = async (service: Service, nextEnabled: boolean) => {
    setTogglingId(service.id);
    if (selectedId === service.id) setDrawerBusyAction("toggle");
    try {
      await api(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      toast.success(nextEnabled ? `已启用 ${service.name}` : `已停用 ${service.name}`);
      await loadServices(selectedId);
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setTogglingId(null);
      setDrawerBusyAction(null);
    }
  };

  const testConnection = async (service: Service) => {
    setDrawerBusyAction("connect");
    try {
      const result = await api<{
        connectionStatus: string;
        serverInfo?: { name?: string; version?: string };
        error?: string;
      }>(`/api/admin/services/${service.id}/test-connection`, { method: "POST" });
      if (result.error) {
        toast.error(result.error);
      } else {
        const info = result.serverInfo?.name
          ? `${result.serverInfo.name}${result.serverInfo.version ? ` v${result.serverInfo.version}` : ""}`
          : "连接正常";
        toast.success(`${service.name} 连接成功（${info}）`);
      }
      await loadServices(selectedId);
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setDrawerBusyAction(null);
    }
  };

  const syncPreview = async (serviceId: string) => {
    setDrawerBusyAction("sync");
    try {
      const result = await api<{ preview: SyncPreview }>(
        `/api/admin/services/${serviceId}/sync-preview`,
        { method: "POST" },
      );
      const { added, modified, deleted } = result.preview;
      if (added.length + modified.length + deleted.length === 0) {
        toast.success("工具目录已是最新，暂无变更");
        setSyncModal(INITIAL_SYNC_MODAL);
        await loadServices(selectedId);
        return;
      }
      setSyncModal({
        open: true,
        serviceId,
        preview: result.preview,
        busy: false,
        staleError: false,
        error: "",
      });
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setDrawerBusyAction(null);
    }
  };

  const confirmSync = async () => {
    if (!syncModal.preview || !syncModal.serviceId) return;
    setSyncModal((prev) => ({ ...prev, busy: true, error: "", staleError: false }));
    try {
      await api(`/api/admin/services/${syncModal.serviceId}/sync-confirm`, {
        method: "POST",
        body: JSON.stringify({ previewId: syncModal.preview.id }),
      });
      toast.success("工具目录同步完成");
      const targetServiceId = syncModal.serviceId;
      setSyncModal(INITIAL_SYNC_MODAL);
      await Promise.all([loadServices(selectedId), loadToolsFor(targetServiceId)]);
    } catch (reason) {
      const isStale = reason instanceof ApiError && reason.status === 409;
      setSyncModal((prev) => ({
        ...prev,
        busy: false,
        staleError: isStale,
        error: errorMessage(reason),
      }));
    }
  };

  return {
    services,
    filteredServices,
    loadingList,
    refreshingList,
    listError,
    search,
    setSearch,
    kindFilter,
    setKindFilter,
    statusFilter,
    setStatusFilter,
    selectedId,
    setSelectedId,
    selectedService,
    tools,
    loadingTools,
    togglingId,
    drawerBusyAction,
    syncModal,
    closeSyncModal: () => setSyncModal(INITIAL_SYNC_MODAL),
    loadServices,
    loadToolsFor,
    toggleEnabled,
    testConnection,
    syncPreview,
    confirmSync,
  };
}
