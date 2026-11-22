import { Client, ProtocolError, SdkHttpError, SSEClientTransport, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { ServiceTable } from "./service-schema.js";
import { resolveServiceCredentials, type CallerContext } from "./credentials.js";

function connectionConfig(service: ServiceTable) {
  return JSON.stringify([service.url, service.transport, service.headers, service.timeoutSeconds]);
}

export class McpSources {
  private readonly clients = new Map<string, { config: string; client: Client; ready: Promise<Client>; connected: boolean }>();
  private readonly active = new Map<Client, number>();
  private readonly retired = new Set<Client>();
  private readonly desired = new Map<string, ServiceTable>();
  private readonly retries = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly retryCounts = new Map<string, number>();
  private readonly errors = new Map<string, { config: string; status: string }>();
  private stopped = false;

  status(service: ServiceTable) {
    const entry = this.clients.get(service.id);
    if (entry?.config === connectionConfig(service) && entry.connected) return "connected";
    const error = this.errors.get(service.id);
    return error?.config === connectionConfig(service) ? error.status : "disconnected";
  }

  async connect(service: ServiceTable, caller?: CallerContext) {
    if (this.stopped) throw new Error("MCP sources have been closed");
    if (service.enabled) this.desired.set(service.id, service);
    const config = connectionConfig(service);
    const existing = this.clients.get(service.id);
    if (existing?.config === config) return existing.ready;
    if (existing) await this.drop(service.id);
    if (service.enabled) this.desired.set(service.id, service);
    const headers = resolveServiceCredentials(service, caller);
    const client = new Client({ name: "agent-capability-hub", version: "1.0.0" }, {
      versionNegotiation: { mode: service.transport === "sse" ? "legacy" : "auto" },
      inputRequired: { autoFulfill: false },
    });
    const transport = service.transport === "sse"
      ? new SSEClientTransport(new URL(service.url), { requestInit: { headers }, eventSourceInit: { fetch: (input, init) => fetch(input, { ...init, headers: new Headers({ ...Object.fromEntries(new Headers(init?.headers)), ...headers }) }) } })
      : new StreamableHTTPClientTransport(new URL(service.url), { requestInit: { headers } });
    const entry = { config, client, ready: Promise.resolve(client), connected: false };
    this.clients.set(service.id, entry);
    client.onclose = () => {
      if (this.clients.get(service.id) === entry) this.connectionFailed(service, new Error("Connection closed"), client);
    };
    entry.ready = client.connect(transport, { timeout: service.timeoutSeconds * 1000 }).then(() => {
      entry.connected = true;
      this.errors.delete(service.id);
      this.retryCounts.delete(service.id);
      return client;
    }).catch(async (error) => {
      this.connectionFailed(service, error, client);
      this.retired.delete(client);
      await client.close();
      throw error;
    });
    return entry.ready;
  }

  async discover(service: ServiceTable) {
    return this.withClient(service, async (client) =>
      (await client.listTools(undefined, { timeout: service.timeoutSeconds * 1000, cacheMode: "refresh" })).tools);
  }

  async withClient<T>(service: ServiceTable, action: (client: Client) => Promise<T>, caller?: CallerContext) {
    const client = await this.connect(service, caller);
    this.active.set(client, (this.active.get(client) ?? 0) + 1);
    try { return await action(client); }
    catch (error) {
      if (!(error instanceof ProtocolError)) this.connectionFailed(service, error, client);
      throw error;
    }
    finally {
      const remaining = (this.active.get(client) ?? 1) - 1;
      if (remaining) this.active.set(client, remaining);
      else {
        this.active.delete(client);
        if (this.retired.delete(client)) await client.close();
      }
    }
  }

  async close() {
    this.stopped = true;
    for (const timer of this.retries.values()) clearTimeout(timer);
    this.retries.clear();
    this.desired.clear();
    await Promise.allSettled([...this.clients.values()].map((entry) => entry.client.close()).concat([...this.retired].map((client) => client.close())));
    this.clients.clear();
    this.retired.clear();
  }

  async drop(serviceId: string) {
    this.desired.delete(serviceId);
    const timer = this.retries.get(serviceId);
    if (timer) clearTimeout(timer);
    this.retries.delete(serviceId);
    this.errors.delete(serviceId);
    const entry = this.clients.get(serviceId);
    this.clients.delete(serviceId);
    if (!entry) return;
    if (this.active.has(entry.client)) this.retired.add(entry.client);
    else await entry.client.close();
  }

  watch(service: ServiceTable) {
    if (this.stopped || !service.enabled || service.kind !== "mcp") return;
    const previous = this.desired.get(service.id);
    this.desired.set(service.id, service);
    if (previous && connectionConfig(previous) === connectionConfig(service)) return;
    const timer = this.retries.get(service.id);
    if (timer) clearTimeout(timer);
    this.retries.delete(service.id);
    this.errors.delete(service.id);
    void this.connect(service).catch(() => {});
  }

  private connectionFailed(service: ServiceTable, error: unknown, client: Client) {
    const entry = this.clients.get(service.id);
    if (entry?.client !== client) return;
    entry.connected = false;
    this.clients.delete(service.id);
    if (this.active.has(client)) this.retired.add(client);
    else void client.close().catch(() => {});
    const authenticationFailed = error instanceof SdkHttpError && (error.status === 401 || error.status === 403);
    this.errors.set(service.id, { config: connectionConfig(service), status: authenticationFailed ? "authentication_failed" : "disconnected" });
    if (authenticationFailed || this.stopped || !this.desired.has(service.id) || this.retries.has(service.id)) return;
    const count = this.retryCounts.get(service.id) ?? 0;
    this.retryCounts.set(service.id, count + 1);
    const timer = setTimeout(() => {
      this.retries.delete(service.id);
      const current = this.desired.get(service.id);
      if (current && !this.stopped) void this.connect(current).catch(() => {});
    }, Math.min(30_000, 1000 * 2 ** Math.min(count, 5)));
    timer.unref();
    this.retries.set(service.id, timer);
  }
}
