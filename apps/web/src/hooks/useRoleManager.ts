import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage, isAbortError } from "../lib/api";
import type { Resource, Role, Service } from "../types";

function computeDiffCount(saved: string[], draft: string[]): number {
  const savedSet = new Set(saved);
  const draftSet = new Set(draft);
  let diff = 0;
  for (const id of savedSet) if (!draftSet.has(id)) diff += 1;
  for (const id of draftSet) if (!savedSet.has(id)) diff += 1;
  return diff;
}

/** Manages role list, resources, AbortController-guarded grants loading, and dirty tracking. */
export function useRoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [savedGrants, setSavedGrants] = useState<string[]>([]);
  const [draftGrants, setDraftGrants] = useState<string[]>([]);

  const [loadingPage, setLoadingPage] = useState(true);
  const [refreshingPage, setRefreshingPage] = useState(false);
  const [pageError, setPageError] = useState("");
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState("");
  const [saving, setSaving] = useState(false);

  const pageAbortRef = useRef<AbortController | null>(null);
  const grantsAbortRef = useRef<AbortController | null>(null);

  const dirtyCount = useMemo(
    () => computeDiffCount(savedGrants, draftGrants),
    [savedGrants, draftGrants],
  );

  const loadAll = useCallback(async (preferredRoleId?: string) => {
    pageAbortRef.current?.abort();
    const controller = new AbortController();
    pageAbortRef.current = controller;
    setRefreshingPage(true);
    try {
      const [roleResult, resourceResult, serviceResult] = await Promise.all([
        api<{ roles: Role[] }>("/api/admin/roles", { signal: controller.signal }),
        api<{ resources: Resource[] }>("/api/admin/resources", { signal: controller.signal }),
        api<{ services: Service[] }>("/api/admin/services", { signal: controller.signal }),
      ]);
      const customRoles = roleResult.roles.filter((role) => !role.isAdmin);
      setRoles(customRoles);
      setServices(serviceResult.services);
      const serviceIds = new Set(serviceResult.services.map((service) => service.id));
      setResources(
        resourceResult.resources.filter(
          (resource) => resource.type === "skill" || serviceIds.has(resource.parentId ?? resource.id),
        ),
      );
      setSelectedRoleId((current) => {
        const target = preferredRoleId ?? current;
        return customRoles.some((role) => role.id === target) ? target : customRoles[0]?.id ?? "";
      });
      setPageError("");
    } catch (reason) {
      if (isAbortError(reason)) return;
      setPageError(errorMessage(reason));
    } finally {
      if (pageAbortRef.current === controller) {
        setLoadingPage(false);
        setRefreshingPage(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAll();
    return () => pageAbortRef.current?.abort();
  }, [loadAll]);

  const loadGrants = useCallback(async (roleId: string) => {
    grantsAbortRef.current?.abort();
    if (!roleId) {
      setSavedGrants([]);
      setDraftGrants([]);
      setGrantsError("");
      setLoadingGrants(false);
      return;
    }
    const controller = new AbortController();
    grantsAbortRef.current = controller;
    setLoadingGrants(true);
    setGrantsError("");
    try {
      const result = await api<{ resourceIds: string[] }>(`/api/admin/roles/${roleId}/resources`, {
        signal: controller.signal,
      });
      setSavedGrants(result.resourceIds);
      setDraftGrants(result.resourceIds);
    } catch (reason) {
      if (isAbortError(reason)) return;
      setGrantsError(errorMessage(reason));
    } finally {
      if (grantsAbortRef.current === controller) {
        setLoadingGrants(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadGrants(selectedRoleId);
    return () => grantsAbortRef.current?.abort();
  }, [selectedRoleId, loadGrants]);

  const saveGrants = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await api(`/api/admin/roles/${selectedRoleId}/resources`, {
        method: "PUT",
        body: JSON.stringify({ resourceIds: draftGrants }),
      });
      setSavedGrants(draftGrants);
      setRoles((prev) =>
        prev.map((role) =>
          role.id === selectedRoleId ? { ...role, grantCount: draftGrants.length } : role,
        ),
      );
      toast.success("角色授权已保存");
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return {
    roles,
    services,
    resources,
    selectedRoleId,
    setSelectedRoleId,
    savedGrants,
    draftGrants,
    setDraftGrants,
    dirtyCount,
    loadingPage,
    refreshingPage,
    pageError,
    loadingGrants,
    grantsError,
    saving,
    loadAll,
    loadGrants,
    saveGrants,
  };
}
