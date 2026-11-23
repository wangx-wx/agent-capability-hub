import request from "supertest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("executes an authorized tool with service credentials and records only formal attempts", async () => {
  source = await startMcpSource();
  platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({
    name: "Docs", kind: "mcp", url: source.url, enabled: true, headers: { Authorization: "Bearer source-credential" },
  }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  const echo = tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Caller" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [echo.id] }).expect(200);
  const created = (await platform.admin.post("/api/admin/users").send({ username: "caller", roleIds: [role.id] }).expect(201)).body;
  const browser = request.agent(platform.app);
  await browser.post("/api/auth/login").send({ username: "caller", password: created.initialPassword }).expect(200);
  const key = (await browser.post("/api/keys").send({ name: "Agent", expiresAt: null }).expect(201)).body.key;
  client = new Client({ name: "call-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${key.value}` } } }));

  expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["docs__echo"]);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "hello" } })).toMatchObject({ content: [{ type: "text", text: "hello" }] });
  expect(await client.callTool({ name: "docs__count", arguments: {} })).toMatchObject({ isError: true });
  expect(source.calls).toEqual([{ name: "echo", arguments: { text: "hello" }, authorization: "Bearer source-credential" }]);
  expect((await browser.get("/api/usage").expect(200)).body).toEqual({ total: 2, successful: 1, failed: 1 });
  const audit = (await platform.admin.get("/api/admin/audit").expect(200)).body.records;
  expect(audit.map((record: { status: string }) => record.status).sort()).toEqual(["failed", "succeeded"]);
  expect(audit.every((record: Record<string, unknown>) => !Object.hasOwn(record, "arguments") && !Object.hasOwn(record, "result"))).toBe(true);
  await platform.admin.post(`/api/admin/services/${service.id}/tools/${echo.id}/test`).send({ arguments: { text: "test" } }).expect(200);
  expect((await browser.get("/api/usage").expect(200)).body.total).toBe(2);
});
