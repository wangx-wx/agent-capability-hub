import { once } from "node:events";
import type { Server } from "node:http";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createDatabase } from "../../src/database/client.js";
import { initializeDatabase } from "../../src/database/initialize.js";

describe("MCP gateway", () => {
  let database: ReturnType<typeof createDatabase> | undefined;
  let server: Server | undefined;
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = undefined;
    await database?.destroy();
    database = undefined;
  });

  it("lets an authenticated SDK client discover the 2026 tools capability", async () => {
    database = createDatabase(":memory:");
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "administrator password" });
    const app = createApp(database);
    const browser = request.agent(app);
    await browser.post("/api/auth/login").send({ username: "root", password: "administrator password" }).expect(200);
    const key = await browser.post("/api/keys").send({ name: "SDK client", expiresAt: null }).expect(201);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP listener");
    client = new Client({ name: "gateway-test", version: "1.0.0" }, {
      versionNegotiation: { mode: { pin: "2026-07-28" } },
    });

    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${key.body.key.value}` } },
    }));

    expect(client.getNegotiatedProtocolVersion()).toBe("2026-07-28");
    expect(client.getServerCapabilities()).toEqual({ tools: {} });
    expect((await client.listTools()).tools).toEqual([]);
  });
});
