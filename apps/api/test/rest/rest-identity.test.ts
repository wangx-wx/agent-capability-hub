import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("prevents ambiguous HTTP method and path identities during manual creation and editing", async () => {
  platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: "https://example.test" }).expect(201)).body.service;
  const route = `/api/admin/services/${service.id}/tools`;
  const first = (await platform.admin.post(route).send({ name: "first", method: "GET", path: "/items" }).expect(201)).body.tool;
  await platform.admin.post(route).send({ name: "duplicate", method: "GET", path: "/items" }).expect(409);
  const second = (await platform.admin.post(route).send({ name: "second", method: "POST", path: "/items" }).expect(201)).body.tool;
  await platform.admin.patch(`${route}/${second.id}`).send({ method: "GET" }).expect(409);
  await platform.admin.patch(`${route}/${first.id}`).send({ description: "same identity" }).expect(200);
  expect((await platform.admin.get(route).expect(200)).body.tools.map((tool: { rest: { method: string } }) => tool.rest.method).sort()).toEqual(["GET", "POST"]);
});
