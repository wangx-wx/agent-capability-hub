import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it, vi } from "vitest";
import { initializeDatabase, type DatabaseSchema } from "../src/database.js";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
  vi.restoreAllMocks();
});

async function prepare(sqlite: Sqlite.Database) {
  source = await startMcpSource();
  platform = await startPlatform(undefined, new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) }));
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "audit-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
}

it("does not send a tool call when SQLite cannot establish its audit record", async () => {
  const sqlite = new Sqlite(":memory:");
  await prepare(sqlite);
  sqlite.pragma("query_only = ON");
  expect(await client!.callTool({ name: "docs__echo", arguments: { text: "must not run" } })).toMatchObject({ isError: true });
  expect(source!.calls).toEqual([]);
  expect((await platform!.admin.get("/api/usage").expect(200)).body.total).toBe(0);
});

it("records malformed tool arguments rejected by the SDK without sending them downstream", async () => {
  await prepare(new Sqlite(":memory:"));
  const response = await fetch(platform!.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${platform!.token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "docs__echo", arguments: "invalid" } }),
  });
  expect(await response.text()).toContain("error");
  expect(source!.calls).toEqual([]);
  expect((await platform!.admin.get("/api/usage").expect(200)).body).toEqual({ total: 1, successful: 0, failed: 1 });
});

it("returns the actual result if audit completion fails and marks it unknown on restart", async () => {
  const sqlite = new Sqlite(":memory:");
  const database = new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) });
  source = await startMcpSource();
  platform = await startPlatform(undefined, database);
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "audit-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  // Fault injection at the external SQLite boundary; observations remain through HTTP APIs.
  sqlite.exec("CREATE TRIGGER reject_audit_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(FAIL, 'audit unavailable'); END");
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "actual result" } })).toMatchObject({ content: [{ type: "text", text: "actual result" }] });
  expect(source.calls).toHaveLength(1);
  expect(stderr).toHaveBeenCalledWith("MCP audit update failed; actual tool result returned\n");
  expect((await platform.admin.get("/api/usage").expect(200)).body).toEqual({ total: 1, successful: 0, failed: 0 });
  expect((await platform.admin.get("/api/admin/audit").expect(200)).body.records[0].status).toBe("running");
  sqlite.exec("DROP TRIGGER reject_audit_update");
  await initializeDatabase(database);
  expect((await platform.admin.get("/api/admin/audit").expect(200)).body.records[0].status).toBe("unknown");
});
