export interface Service {
  id: string; name: string; description: string; namespace: string; kind: "mcp" | "rest";
  url: string; transport: "http" | "sse"; headers: Record<string, string>; timeoutSeconds: number;
  enabled: boolean; connectionStatus: string;
}
export interface RegisteredTool {
  id: string; serviceId: string; originalName: string; name: string; description?: string;
  inputSchema: Record<string, unknown>; example?: Record<string, unknown>; rest?: Record<string, unknown>;
}
export const connectionLabels: Record<string, string> = {
  connected: "已连接", disconnected: "未连接", authentication_failed: "认证失败", ready: "配置有效",
};
