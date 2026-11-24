export type ViewId = "overview" | "users" | "roles" | "keys" | "services" | "audit";

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
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  isAdmin: boolean;
  userCount?: number;
  grantCount?: number;
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
  toolCount?: number;
}

export const connectionKindLabels: Record<Service["kind"], string> = {
  mcp: "原生 MCP",
  rest: "REST API",
};

export interface RestParameter {
  in: "path" | "query" | "header";
  name: string;
  schema: Record<string, unknown>;
  required?: boolean;
  style?: string;
  explode?: boolean;
}

export interface RestMapping {
  method: string;
  path: string;
  parameters: RestParameter[];
  bodySchema?: Record<string, unknown> | boolean;
  bodyRequired?: boolean;
  bodyContentType?: string;
  schemaDefs?: Record<string, unknown>;
}

export interface RegisteredTool {
  id: string;
  serviceId: string;
  originalName: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  example?: Record<string, unknown>;
  rest?: RestMapping;
}

export interface AuditRecord {
  id: string;
  userId: string;
  username: string;
  keyId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  toolId: string | null;
  toolName: string;
  createdAt: string;
  status: "running" | "succeeded" | "failed" | "unknown";
  durationMs: number | null;
  clientName: string | null;
  clientVersion: string | null;
}

export interface AuditResponse {
  records: AuditRecord[];
  total: number;
  hasMore: boolean;
}

export interface SecretReveal {
  kind: "password" | "api-key";
  title: string;
  value: string;
}

export const connectionLabels: Record<string, string> = {
  connected: "已连接",
  disconnected: "未连接",
  authentication_failed: "认证失败",
  ready: "配置有效",
};
