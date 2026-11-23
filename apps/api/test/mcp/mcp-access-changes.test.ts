import request from "supertest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
afterEach(async () => { await client?.close(); client = undefined; await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("applies changed role grants and revoked keys to new formal calls while retaining user history", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  const echo = tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Caller" }).expect(201)).body.role;
  const grantRoute = `/api/admin/roles/${role.id}/resources`;
  await platform.admin.put(grantRoute).send({ resourceIds: [echo.id] }).expect(200);
  const user = (await platform.admin.post("/api/admin/users").send({ username: "caller", roleIds: [role.id] }).expect(201)).body;
  const browser = request.agent(platform.app);
  await browser.post("/api/auth/login").send({ username: "caller", password: user.initialPassword }).expect(200);
  const key = (await browser.post("/api/keys").send({ name: "Caller", expiresAt: null }).expect(201)).body.key;
  client = new Client({ name: "access-test", version: "1" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${key.value}` } } }));
  await client.callTool({ name: "docs__echo", arguments: { text: "allowed" } });
  await platform.admin.put(grantRoute).send({ resourceIds: [] }).expect(200);
  expect((await client.listTools()).tools).toEqual([]);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "denied" } })).toMatchObject({ isError: true });
  await platform.admin.put(grantRoute).send({ resourceIds: [echo.id] }).expect(200);
  await browser.delete(`/api/keys/${key.id}`).expect(204);
  const invalid = await fetch(platform.url, { method: "POST", headers: { Authorization: `Bearer ${key.value}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "docs__echo", arguments: { text: "revoked" } } }) });
  expect(invalid.status).toBe(401);
  expect(source.calls).toHaveLength(1);
  expect((await browser.get("/api/usage").expect(200)).body).toEqual({ total: 2, successful: 1, failed: 1 });
});
