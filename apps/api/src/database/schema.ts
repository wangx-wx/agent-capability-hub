interface UserTable {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: number;
  active: number;
  createdAt: string;
}

interface RoleTable {
  id: string;
  name: string;
  isAdmin: number;
  createdAt: string;
}

interface UserRoleTable {
  userId: string;
  roleId: string;
}

interface ResourceTable {
  id: string;
  type: "service" | "tool" | "skill";
  visibility: "public" | "restricted";
  parentId: string | null;
  name: string;
  description: string;
}

interface RoleResourceTable {
  roleId: string;
  resourceId: string;
}

interface ApiKeyTable {
  id: string;
  userId: string;
  name: string;
  value: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface SessionTable {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserTable;
  roles: RoleTable;
  user_roles: UserRoleTable;
  resources: ResourceTable;
  role_resources: RoleResourceTable;
  api_keys: ApiKeyTable;
  sessions: SessionTable;
  services: ServiceTable;
  tools: ToolTable;
  audit: AuditTable;
}

export interface ServiceTable {
  id: string;
  kind: "mcp" | "rest";
  namespace: string;
  url: string;
  transport: "http" | "sse";
  headers: string;
  timeoutSeconds: number;
  enabled: number;
}

export interface ToolTable {
  id: string;
  serviceId: string;
  originalName: string;
  definition: string;
}

export interface AuditTable {
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
  clientName: string | null;
  clientVersion: string | null;
}
