export type ViewId = "overview" | "users" | "roles" | "keys" | "services" | "imports" | "audit";

export interface SessionUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface User {
  id: string;
  username: string;
  active: boolean;
  isAdmin: boolean;
  roleIds: string[];
}

export interface Role {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface Resource {
  id: string;
  type: "service" | "tool" | "skill";
  visibility: "public" | "restricted";
  parentId: string | null;
  name: string;
  description: string;
}

export interface ApiKey {
  id: string;
  userId?: string;
  name: string;
  value: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  namespace: string;
  kind: "mcp" | "rest";
  url: string;
  transport: "http" | "sse";
  headers: Record<string, string>;
  timeoutSeconds: number;
  enabled: boolean;
  connectionStatus: string;
}

export interface RegisteredTool {
  id: string;
  serviceId: string;
  originalName: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  example?: Record<string, unknown>;
  rest?: Record<string, unknown>;
}

export interface SecretReveal {
  title: string;
  value: string;
}

export const connectionLabels: Record<string, string> = {
  connected: "已连接",
  disconnected: "未连接",
  authentication_failed: "认证失败",
  ready: "配置有效",
};
