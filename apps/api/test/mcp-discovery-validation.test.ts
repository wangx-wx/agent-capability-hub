import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("does not interpret SDK-excluded invalid tools as administrator-confirmed deletions", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const route = `/api/admin/services/${service.id}`;
  const preview = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform.admin.post(`${route}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  source.tools[1].inputSchema = { type: "object", properties: { value: { type: "object", "x-mcp-header": "Invalid" } } };
  const failed = await platform.admin.post(`${route}/sync-preview`).expect(502);
  expect(failed.body.error).toMatch(/x-mcp-header/i);
  expect((await platform.admin.get(`${route}/tools`).expect(200)).body.tools.map((tool: { id: string }) => tool.id).sort()).toEqual(tools.map((tool: { id: string }) => tool.id).sort());
});
