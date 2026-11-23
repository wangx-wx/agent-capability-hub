import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("renames public tools immediately while preserving IDs, grants and historical names", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  const echo = tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Readers" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [echo.id] }).expect(200);
  client = new Client({ name: "rename-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  await client.callTool({ name: "docs__echo", arguments: { text: "before rename" } });
  const impact = (await platform.admin.post(`/api/admin/services/${service.id}/config-preview`).send({ namespace: "knowledge" }).expect(200)).body;
  expect(impact.renamedTools).toContainEqual({ id: echo.id, oldName: "docs__echo", newName: "knowledge__echo" });
  await platform.admin.patch(`/api/admin/services/${service.id}`).send({ namespace: "knowledge" }).expect(200);
  expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["knowledge__count", "knowledge__echo"]);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "old" } })).toMatchObject({ isError: true });
  expect(await client.callTool({ name: "knowledge__echo", arguments: { text: "new" } })).toMatchObject({ content: [{ type: "text", text: "new" }] });
  expect((await platform.admin.get(`/api/admin/roles/${role.id}/resources`).expect(200)).body.resourceIds).toEqual([echo.id]);
  expect((await platform.admin.get("/api/admin/audit").expect(200)).body.records.map((row: { toolName: string }) => row.toolName)).toContain("docs__echo");
  await platform.admin.delete(`/api/admin/services/${service.id}`).expect(204);
  expect((await platform.admin.get("/api/admin/resources").expect(200)).body.resources.some((row: { id: string }) => row.id === echo.id)).toBe(false);
  expect((await platform.admin.get("/api/usage").expect(200)).body).toEqual({ total: 3, successful: 2, failed: 1 });
});
