import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startRestSource } from "../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("matches reimports by HTTP method and path while preserving grants and unselected tools", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true }).expect(201)).body.service;
  const old = (await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "old-name", method: "POST", path: "/update",
    bodySchema: { type: "object", properties: { label: { type: "string" } }, required: ["label"] }, bodyRequired: true }).expect(201)).body.tool;
  const keep = (await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "keep", method: "GET", path: "/keep" }).expect(201)).body.tool;
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Readers" }).expect(201)).body.role;
  await platform.admin.put(`/api/admin/roles/${role.id}/resources`).send({ resourceIds: [old.id] }).expect(200);
  client = new Client({ name: "reimport-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  await client.callTool({ name: "rest__old-name", arguments: { body: { label: "before" } } });
  const document = { openapi: "3.1.0", servers: [{ url: source.url }], paths: {
    "/update": { post: { operationId: "new-name", requestBody: { required: true, content: { "application/json": { schema: {
      type: "object", properties: { label: { type: "string", minLength: 3 } }, required: ["label"],
    } } } }, responses: { "200": { description: "Updated" } } } },
    "/new": { get: { operationId: "not-selected", responses: { "200": { description: "New" } } } },
  } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document), targetServices: { [source.url]: service.id } }).expect(200)).body.preview;
  const group = preview.groups[0];
  expect(group.serviceId).toBe(service.id);
  expect(group.operations.map((operation: { change: string }) => operation.change)).toEqual(["modified", "added"]);
  const operation = group.operations[0];
  expect(operation.existingToolId).toBe(old.id);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, serviceId: service.id, operations: [{ operationId: operation.id }] }] }).expect(200);
  const tools = (await platform.admin.get(`/api/admin/services/${service.id}/tools`).expect(200)).body.tools;
  expect(tools.map((tool: { id: string }) => tool.id).sort()).toEqual([old.id, keep.id].sort());
  expect(tools.find((tool: { id: string }) => tool.id === old.id).name).toBe("rest__new-name");
  expect((await platform.admin.get(`/api/admin/roles/${role.id}/resources`).expect(200)).body.resourceIds).toEqual([old.id]);
  expect(await client.callTool({ name: "rest__new-name", arguments: { body: { label: "x" } } })).toMatchObject({ isError: true });
  expect(await client.callTool({ name: "rest__new-name", arguments: { body: { label: "after" } } })).toMatchObject({ isError: false });
  expect((await platform.admin.get("/api/admin/audit").expect(200)).body.records.map((record: { toolName: string }) => record.toolName)).toContain("rest__old-name");
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toHaveLength(1);
});
