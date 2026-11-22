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
