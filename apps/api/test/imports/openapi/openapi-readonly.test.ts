import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../../fixtures/platform.js";
import { startRestSource } from "../../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("applies request-direction readOnly across allOf without weakening unrelated required fields", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const document = { openapi: "3.1.0", servers: [{ url: source.url }], components: { schemas: { Required: { type: "object", required: ["id", "name"], properties: { id: { type: "integer" }, name: { type: "string" } } } } }, paths: { "/items": { post: { operationId: "create", requestBody: { required: true, content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/Required" }, { type: "object", properties: { id: { type: "integer", readOnly: true } } }] } } } } } } } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  const group = preview.groups[0];
  const result = (await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, namespace: "items", enabled: true, operations: [{ operationId: group.operations[0].id }] }] }).expect(200)).body.groups[0];
  const trial = `/api/admin/services/${result.service.id}/tools/${result.tools[0].id}/test`;
  expect((await platform.admin.post(trial).send({ arguments: { body: { name: "created" } } }).expect(200)).body.result.isError).toBe(false);
  expect((await platform.admin.post(trial).send({ arguments: { body: {} } }).expect(200)).body.result.isError).toBe(true);
  expect(source.requests).toHaveLength(1);
});
