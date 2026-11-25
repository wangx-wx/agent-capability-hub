import { useCallback, useEffect, useState } from "react";
import type { ViewId } from "../types";

export interface RouteState {
  view: ViewId;
  keyOwnerId?: string;
}

const ADMIN_VIEWS = new Set<ViewId>(["users", "roles"]);
const ALL_VIEWS = new Set<ViewId>(["overview", "services", "audit", "users", "roles", "keys"]);

export const VIEW_TITLES: Record<ViewId, string> = {
  overview: "概览",
  services: "MCP 服务",
  audit: "调用审计",
  users: "用户",
  roles: "角色与授权",
  keys: "API Keys",
};

/** Parses window.location.hash into a normalized workspace route. */
export function parseHashRoute(hash: string): RouteState {
  const raw = hash.replace(/^#/, "").replace(/^\/+/, "");
  if (!raw) return { view: "overview" };
  const segments = raw.split("/").filter(Boolean);
  if (segments[0] === "users" && segments.length === 3 && segments[2] === "keys") {
    return { view: "keys", keyOwnerId: decodeURIComponent(segments[1]) };
  }
  const candidate = segments[0] as ViewId;
  if (ALL_VIEWS.has(candidate)) {
    return { view: candidate };
  }
  return { view: "overview" };
}

/** Formats a RouteState into a canonical hash URL. */
export function buildHashRoute(view: ViewId, keyOwnerId?: string): string {
  if (view === "keys" && keyOwnerId) {
    return `#/users/${encodeURIComponent(keyOwnerId)}/keys`;
  }
  return `#/${view}`;
}

function normalizeForUser(route: RouteState, isAdmin: boolean): RouteState {
  if (!isAdmin && ADMIN_VIEWS.has(route.view)) {
    return { view: "overview" };
  }
  if (!isAdmin && route.keyOwnerId) {
    return { view: "keys" };
  }
  return route;
}

/**
 * Synchronizes view state with window.location.hash, enforces admin route
 * guards, resets scroll position on view change, and updates document.title.
 */
export function useHashRoute(isAdmin: boolean, guardActive = true) {
  const [route, setRoute] = useState<RouteState>(() => parseHashRoute(window.location.hash));

  useEffect(() => {
    const sync = () => {
      const parsed = parseHashRoute(window.location.hash);
      if (!guardActive) {
        setRoute(parsed);
        return;
      }
      const next = normalizeForUser(parsed, isAdmin);
      const targetHash = buildHashRoute(next.view, next.keyOwnerId);
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, "", targetHash);
      }
      setRoute(next);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [isAdmin, guardActive]);

  useEffect(() => {
    document.title = `${VIEW_TITLES[route.view]} · Agent 能力中台`;
    window.scrollTo(0, 0);
  }, [route.view, route.keyOwnerId]);

  const navigate = useCallback(
    (view: ViewId, keyOwnerId?: string) => {
      const next = normalizeForUser({ view, keyOwnerId }, isAdmin);
      const targetHash = buildHashRoute(next.view, next.keyOwnerId);
      setRoute(next);
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        window.scrollTo(0, 0);
      }
    },
    [isAdmin],
  );

  return { route, navigate };
}
