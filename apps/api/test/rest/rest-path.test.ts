import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startRestSource } from "../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("rejects dot path segments that URL normalization would silently route elsewhere", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true }).expect(201)).body.service;
  const tool = (await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "read", method: "GET", path: "/items/{id}", parameters: [{ in: "path", name: "id", schema: { type: "string" } }] }).expect(201)).body.tool;
  for (const id of [".", ".."]) {
    const result = (await platform.admin.post(`/api/admin/services/${service.id}/tools/${tool.id}/test`).send({ arguments: { path: { id } } }).expect(200)).body.result;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/dot.*segment/i);
  }
  expect(source.requests).toHaveLength(0);
});
