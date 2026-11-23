import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("rejects public-name collisions across distinct namespaces without changing the existing catalog", async () => {
  platform = await startPlatform();
  const first = (await platform.admin.post("/api/admin/services").send({ name: "First", namespace: "a__b", kind: "rest", url: "http://127.0.0.1:1" }).expect(201)).body.service;
  const second = (await platform.admin.post("/api/admin/services").send({ name: "Second", namespace: "a", kind: "rest", url: "http://127.0.0.1:1" }).expect(201)).body.service;
  const tool = (await platform.admin.post(`/api/admin/services/${first.id}/tools`).send({ name: "c", method: "GET", path: "/first" }).expect(201)).body.tool;
  await platform.admin.post(`/api/admin/services/${second.id}/tools`).send({ name: "b__c", method: "GET", path: "/second" }).expect(409);
  expect((await platform.admin.get(`/api/admin/services/${first.id}/tools`).expect(200)).body.tools[0].id).toBe(tool.id);
  expect((await platform.admin.get(`/api/admin/services/${second.id}/tools`).expect(200)).body.tools).toEqual([]);
});
