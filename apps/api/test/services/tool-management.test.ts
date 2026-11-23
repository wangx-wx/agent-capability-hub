import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startRestSource } from "../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
let client: Client | undefined;
afterEach(async () => { await client?.close(); client = undefined; await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("edits a REST tool without losing grants and explicitly deletes it without losing history", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true }).expect(201)).body.service;
  const tool = (await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "old", method: "GET", path: "/read" }).expect(201)).body.tool;
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Reader" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [tool.id] }).expect(200);
  client = new Client({ name: "management-test", version: "1" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  await client.callTool({ name: "rest__old", arguments: {} });
  const edited = await platform.admin.patch(`/api/admin/services/${service.id}/tools/${tool.id}`).send({ name: "new", description: "Updated" }).expect(200);
  expect(edited.body.tool).toMatchObject({ id: tool.id, name: "rest__new", description: "Updated" });
  expect((await platform.admin.get(`/api/admin/roles/${role.id}/resources`).expect(200)).body.resourceIds).toEqual([tool.id]);
  await platform.admin.delete(`/api/admin/services/${service.id}/tools/${tool.id}`).expect(204);
  expect((await client.listTools()).tools).toEqual([]);
  expect((await platform.admin.get(`/api/admin/roles/${role.id}/resources`).expect(200)).body.resourceIds).toEqual([]);
  expect((await platform.admin.get("/api/admin/audit").expect(200)).body.records[0].toolName).toBe("rest__old");
});
