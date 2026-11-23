import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startSseSource } from "./fixtures/sse-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startSseSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("reports SSE authentication failure and lets the administrator correct and test the saved configuration", async () => {
  source = await startSseSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Legacy", kind: "mcp", transport: "sse", url: source.url,
    headers: { Authorization: "Bearer wrong" } }).expect(201)).body.service;
  const failed = await platform.admin.post(`/api/admin/services/${service.id}/test-connection`).expect(200);
  expect(failed.body).toMatchObject({ connectionStatus: "authentication_failed", error: expect.any(String) });
  expect((await platform.admin.get(`/api/admin/services/${service.id}`).expect(200)).body.service.headers.Authorization).toBe("Bearer wrong");
  await platform.admin.patch(`/api/admin/services/${service.id}`).send({ headers: { Authorization: "Bearer sse-secret" } }).expect(200);
  expect((await platform.admin.post(`/api/admin/services/${service.id}/test-connection`).expect(200)).body.connectionStatus).toBe("connected");
  expect((await platform.admin.get(`/api/admin/services/${service.id}/tools`).expect(200)).body.tools).toEqual([]);
  expect((await platform.admin.get("/api/usage").expect(200)).body.total).toBe(0);
});
