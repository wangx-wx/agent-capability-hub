import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import request from "supertest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { initializeDatabase } from "../../src/database/initialize.js";
import type { DatabaseSchema } from "../../src/database/schema.js";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.map((client) => client.close().catch(() => undefined)));
  clients.length = 0;
  await platform?.close();
  platform = undefined;
  await source?.close();
  source = undefined;
});

async function connectClient(url: URL, token: string, clientInfo: { name: string; version: string }) {
  const client = new Client(clientInfo, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  clients.push(client);
  return client;
}

it("records non-negative durationMs on finished calls and keeps null on running/unknown calls", async () => {
  const sqlite = new Sqlite(":memory:");
  const database = new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) });
  source = await startMcpSource();
  platform = await startPlatform(undefined, database);

  const service = (
    await platform.admin
      .post("/api/admin/services")
      .send({ name: "Docs", namespace: "docs", kind: "mcp", url: source.url, enabled: true })
      .expect(201)
  ).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);

  const client = await connectClient(platform.url, platform.token, { name: "duration-client", version: "1.0.0" });

  // Succeeded call
  await client.callTool({ name: "docs__echo", arguments: { text: "ok" } });
  // Failed call (denied/nonexistent tool)
  await client.callTool({ name: "docs__missing", arguments: {} });

  // Inflight running call
  const hold = source.holdCalls();
  const pending = client.callTool({ name: "docs__echo", arguments: { text: "inflight" } });
  try {
    await hold.started;

    const midAudit = (await platform.admin.get("/api/admin/audit").expect(200)).body.records as Array<{
      status: string;
      durationMs: number | null;
      errorMessage?: unknown;
    }>;
    const runningRow = midAudit.find((record) => record.status === "running");
    const succeededRow = midAudit.find((record) => record.status === "succeeded");
    const failedRow = midAudit.find((record) => record.status === "failed");
    expect(runningRow?.durationMs).toBeNull();
    expect(typeof succeededRow?.durationMs).toBe("number");
    expect(Number.isInteger(succeededRow?.durationMs)).toBe(true);
    expect((succeededRow?.durationMs ?? -1) >= 0).toBe(true);
    expect(typeof failedRow?.durationMs).toBe("number");
    expect(Number.isInteger(failedRow?.durationMs)).toBe(true);
    expect((failedRow?.durationMs ?? -1) >= 0).toBe(true);
    expect(midAudit.every((record) => !Object.hasOwn(record, "errorMessage"))).toBe(true);

    // Simulate process restart while running call is unfinished -> marked unknown with durationMs still null.
    await initializeDatabase(database);
    const afterRestart = (await platform.admin.get("/api/admin/audit").expect(200)).body.records as Array<{
      status: string;
      durationMs: number | null;
    }>;
    expect(afterRestart.find((record) => record.status === "unknown")?.durationMs).toBeNull();
  } finally {
    hold.release();
    await pending.catch(() => undefined);
  }
});

it("filters audit records by status and q, clamps limit, and returns total and hasMore", async () => {
  source = await startMcpSource();
  platform = await startPlatform();

  const docs = (
    await platform.admin
      .post("/api/admin/services")
      .send({ name: "Alpha Service", namespace: "alpha", kind: "mcp", url: source.url, enabled: true })
      .expect(201)
  ).body.service;
  const docsPreview = (await platform.admin.post(`/api/admin/services/${docs.id}/sync-preview`).expect(200)).body.preview;
  const docsTools = (
    await platform.admin
      .post(`/api/admin/services/${docs.id}/sync-confirm`)
      .send({ previewId: docsPreview.id })
      .expect(200)
  ).body.tools as Array<{ id: string; originalName: string }>;

  const beta = (
    await platform.admin
      .post("/api/admin/services")
      .send({ name: "Beta Service", namespace: "beta", kind: "mcp", url: source.url, enabled: true })
      .expect(201)
  ).body.service;
  const betaPreview = (await platform.admin.post(`/api/admin/services/${beta.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin
    .post(`/api/admin/services/${beta.id}/sync-confirm`)
    .send({ previewId: betaPreview.id })
    .expect(200);

  const echoTool = docsTools.find((tool) => tool.originalName === "echo")!;
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Caller" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [echoTool.id] }).expect(200);
  const created = (await platform.admin.post("/api/admin/users").send({ username: "Alice_Agent", roleIds: [role.id] }).expect(201)).body;
  const aliceBrowser = request.agent(platform.app);
  await aliceBrowser.post("/api/auth/login").send({ username: "Alice_Agent", password: created.initialPassword }).expect(200);
  const aliceKey = (await aliceBrowser.post("/api/keys").send({ name: "K1", expiresAt: null }).expect(201)).body.key.value as string;

  const adminClient = await connectClient(platform.url, platform.token, { name: "Claude Desktop", version: "1.0.0" });
  const aliceClient = await connectClient(platform.url, aliceKey, { name: "Codex CLI", version: "2.0.0" });

  await adminClient.callTool({ name: "alpha__echo", arguments: { text: "1" } }); // root, Alpha Service, alpha__echo, Claude Desktop, succeeded
  await adminClient.callTool({ name: "beta__count", arguments: {} }); // root, Beta Service, beta__count, Claude Desktop, succeeded
  await aliceClient.callTool({ name: "alpha__echo", arguments: { text: "2" } }); // Alice_Agent, Alpha Service, alpha__echo, Codex CLI, succeeded
  await aliceClient.callTool({ name: "alpha__count", arguments: {} }); // Alice_Agent, Alpha Service, alpha__count, Codex CLI, failed

  // Exact boundary when limit === total -> hasMore must be false
  const exact = (await platform.admin.get("/api/admin/audit?limit=4&offset=0").expect(200)).body;
  expect(exact.records).toHaveLength(4);
  expect(exact.total).toBe(4);
  expect(exact.hasMore).toBe(false);

  // Pagination with limit & offset
  const page1 = (await platform.admin.get("/api/admin/audit?limit=2&offset=0").expect(200)).body;
  expect(page1.records).toHaveLength(2);
  expect(page1.total).toBe(4);
  expect(page1.hasMore).toBe(true);

  const page2 = (await platform.admin.get("/api/admin/audit?limit=2&offset=2").expect(200)).body;
  expect(page2.records).toHaveLength(2);
  expect(page2.total).toBe(4);
  expect(page2.hasMore).toBe(false);

  // Clamping limit <= 0 -> 1 and > 100 -> 100
  const minLimit = (await platform.admin.get("/api/admin/audit?limit=0").expect(200)).body;
  expect(minLimit.records).toHaveLength(1);
  expect(minLimit.total).toBe(4);
  expect(minLimit.hasMore).toBe(true);

  const maxLimit = (await platform.admin.get("/api/admin/audit?limit=999").expect(200)).body;
  expect(maxLimit.records).toHaveLength(4);

  // Status filter
  const failedOnly = (await platform.admin.get("/api/admin/audit?status=failed").expect(200)).body;
  expect(failedOnly.total).toBe(1);
  expect(failedOnly.hasMore).toBe(false);
  expect(failedOnly.records[0].toolName).toBe("alpha__count");

  // Case-insensitive search across username, serviceName, toolName, clientName
  const byUser = (await platform.admin.get("/api/admin/audit?q=alice_agent").expect(200)).body;
  expect(byUser.total).toBe(2);

  const byService = (await platform.admin.get("/api/admin/audit?q=BETA").expect(200)).body;
  expect(byService.total).toBe(1);
  expect(byService.records[0].serviceName).toBe("Beta Service");

  const byTool = (await platform.admin.get("/api/admin/audit?q=alpha__echo").expect(200)).body;
  expect(byTool.total).toBe(2);

  const byClient = (await platform.admin.get("/api/admin/audit?q=codex").expect(200)).body;
  expect(byClient.total).toBe(2);

  // Combined status + q
  const combined = (await platform.admin.get("/api/admin/audit?status=succeeded&q=codex").expect(200)).body;
  expect(combined.total).toBe(1);
  expect(combined.records[0].toolName).toBe("alpha__echo");
});
