import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("invalidates older previews and rejects discovery that arrives after a newer preview", async () => {
  source = await startMcpSource(); source.tools.splice(1); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const route = `/api/admin/services/${service.id}`;
  const initial = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  const hold = source.holdDiscovery();
  const delayed = platform.admin.post(`${route}/sync-preview`).then((result) => result);
  await hold.started;
  source.tools[0] = { ...source.tools[0], description: "Newest definition" };
  const latest = (await platform.admin.post(`${route}/sync-preview`).expect(200)).body.preview;
  hold.release();
  expect((await delayed).status).toBe(409);
  await platform.admin.post(`${route}/sync-confirm`).send({ previewId: initial.id }).expect(409);
  const confirmed = (await platform.admin.post(`${route}/sync-confirm`).send({ previewId: latest.id }).expect(200)).body.tools;
  expect(confirmed[0].description).toBe("Newest definition");
});
