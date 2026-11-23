import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("keeps a registered service type fixed so existing tools retain their execution adapter", async () => {
  platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: "https://example.test", enabled: true }).expect(201)).body.service;
  await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "read", method: "GET", path: "/read" }).expect(201);
  await platform.admin.post(`/api/admin/services/${service.id}/config-preview`).send({ kind: "mcp" }).expect(400);
  await platform.admin.patch(`/api/admin/services/${service.id}`).send({ kind: "mcp" }).expect(400);
  expect((await platform.admin.get(`/api/admin/services/${service.id}`).expect(200)).body.service.kind).toBe("rest");
});
