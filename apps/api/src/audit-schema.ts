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
