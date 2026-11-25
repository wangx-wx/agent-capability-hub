import request from "supertest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

async function syncService(name: string, namespace: string) {
  const service = (await platform!.admin.post("/api/admin/services").send({ name, namespace, kind: "mcp", url: source!.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform!.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform!.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  return { service, tools };
}

async function connect(path: string, token: string) {
  const client = new Client({ name: "path-access-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  clients.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(path, platform!.url.origin), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  return client;
}

it("scopes namespace endpoints and user service catalogs to assigned tools", async () => {
  source = await startMcpSource();
  platform = await startPlatform();
  const alpha = await syncService("Alpha", "alpha");
  await syncService("Beta", "beta");

  const adminClient = await connect("/alpha/mcp", platform.token);
  expect((await adminClient.listTools()).tools.map((tool) => tool.name)).toEqual(["alpha__count", "alpha__echo"]);
  expect(await adminClient.callTool({ name: "beta__echo", arguments: { text: "wrong service" } })).toMatchObject({ isError: true });

  const echo = alpha.tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Alpha Caller" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [echo.id] }).expect(200);
  const created = (await platform.admin.post("/api/admin/users").send({ username: "path-caller", roleIds: [role.id] }).expect(201)).body;
  const browser = request.agent(platform.app);
  await browser.post("/api/auth/login").send({ username: "path-caller", password: created.initialPassword }).expect(200);
  const key = (await browser.post("/api/keys").send({ name: "Path caller", expiresAt: null }).expect(201)).body.key;

  const catalog = (await browser.get("/api/services/catalog").expect(200)).body.services;
  expect(catalog.map((service: { namespace: string }) => service.namespace)).toEqual(["alpha"]);
  expect(catalog[0]).toMatchObject({ url: "/alpha/mcp", headers: {}, toolCount: 1 });
  const visibleTools = (await browser.get(`/api/services/${alpha.service.id}/tools`).expect(200)).body.tools;
  expect(visibleTools.map((tool: { name: string }) => tool.name)).toEqual(["alpha__echo"]);

  const userClient = await connect("/alpha/mcp", key.value);
  expect((await userClient.listTools()).tools.map((tool) => tool.name)).toEqual(["alpha__echo"]);
  expect(await userClient.callTool({ name: "alpha__count", arguments: {} })).toMatchObject({ isError: true });
  await userClient.callTool({ name: "alpha__echo", arguments: { text: "allowed" } });

  await platform.admin.patch(`/api/admin/services/${alpha.service.id}`).send({ namespace: "renamed-alpha" }).expect(200);
  await request(platform.app).post("/alpha/mcp").set("Authorization", `Bearer ${platform.token}`).send({ jsonrpc: "2.0", id: 1, method: "tools/list" }).expect(404);
  const renamedClient = await connect("/renamed-alpha/mcp", platform.token);
  expect((await renamedClient.listTools()).tools.map((tool) => tool.name)).toContain("renamed-alpha__echo");
});
