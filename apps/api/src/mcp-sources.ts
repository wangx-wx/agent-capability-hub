import { Client, SSEClientTransport, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { ServiceTable } from "./service-schema.js";
import { resolveServiceCredentials } from "./credentials.js";

function connectionConfig(service: ServiceTable) {
  return JSON.stringify([service.url, service.transport, service.headers, service.timeoutSeconds]);
}

export class McpSources {
  private readonly clients = new Map<string, { config: string; client: Client; ready: Promise<Client>; connected: boolean }>();

  status(service: ServiceTable) {
    const entry = this.clients.get(service.id);
    return entry?.config === connectionConfig(service) && entry.connected ? "connected" : "disconnected";
  }

  async connect(service: ServiceTable) {
    const config = connectionConfig(service);
    const existing = this.clients.get(service.id);
    if (existing?.config === config) return existing.ready;
    if (existing) await existing.client.close();
    const headers = resolveServiceCredentials(service);
    const client = new Client({ name: "agent-capability-hub", version: "1.0.0" }, {
      versionNegotiation: { mode: service.transport === "sse" ? "legacy" : "auto" },
      inputRequired: { autoFulfill: false },
    });
    const transport = service.transport === "sse"
      ? new SSEClientTransport(new URL(service.url), { requestInit: { headers }, eventSourceInit: { fetch: (input, init) => fetch(input, { ...init, headers: new Headers({ ...Object.fromEntries(new Headers(init?.headers)), ...headers }) }) } })
      : new StreamableHTTPClientTransport(new URL(service.url), { requestInit: { headers } });
    const entry = { config, client, ready: Promise.resolve(client), connected: false };
    this.clients.set(service.id, entry);
    client.onclose = () => { entry.connected = false; };
    entry.ready = client.connect(transport, { timeout: service.timeoutSeconds * 1000 }).then(() => {
      entry.connected = true;
      return client;
    }).catch(async (error) => {
      if (this.clients.get(service.id) === entry) this.clients.delete(service.id);
      await client.close();
      throw error;
    });
    return entry.ready;
  }

  async discover(service: ServiceTable) {
    const client = await this.connect(service);
    return (await client.listTools(undefined, { timeout: service.timeoutSeconds * 1000, cacheMode: "refresh" })).tools;
  }

  async close() {
    await Promise.allSettled([...this.clients.values()].map((entry) => entry.client.close()));
    this.clients.clear();
  }

  async drop(serviceId: string) {
    const entry = this.clients.get(serviceId);
    this.clients.delete(serviceId);
    await entry?.client.close();
  }
}
