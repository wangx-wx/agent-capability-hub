import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("preserves grants on schema updates but assigns a fresh unauthorized ID when a deleted tool reappears", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const route = `/api/admin/services/${service.id}`;
  const preview = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  const tools = (await platform.admin.post(`${route}/sync-confirm`).send({ previewId: preview.id }).expect(200)).body.tools;
  const echo = tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Caller" }).expect(201)).body.role;
  const grants = `/api/admin/roles/${role.id}/resources`;
  await platform.admin.put(grants).send({ resourceIds: [echo.id] }).expect(200);
  source.tools[0] = { ...source.tools[0], description: "Updated schema", inputSchema: { type: "object", properties: { text: { type: "string", minLength: 3 } }, required: ["text"] } };
  const update = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  expect(update.modified[0].id).toBe(echo.id);
  await platform.admin.post(`${route}/sync-confirm`).send({ previewId: update.id }).expect(200);
  expect((await platform.admin.get(grants).expect(200)).body.resourceIds).toEqual([echo.id]);
  const removed = source.tools.shift()!;
  const deletion = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  expect(deletion.deleted[0].id).toBe(echo.id);
  await platform.admin.post(`${route}/sync-confirm`).send({ previewId: deletion.id }).expect(200);
  expect((await platform.admin.get(grants).expect(200)).body.resourceIds).toEqual([]);
  source.tools.push(removed);
  const reappearance = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  const restored = (await platform.admin.post(`${route}/sync-confirm`).send({ previewId: reappearance.id }).expect(200)).body.tools.find((tool: { originalName: string }) => tool.originalName === "echo");
  expect(restored.id).not.toBe(echo.id);
  expect((await platform.admin.get(grants).expect(200)).body.resourceIds).toEqual([]);
});
