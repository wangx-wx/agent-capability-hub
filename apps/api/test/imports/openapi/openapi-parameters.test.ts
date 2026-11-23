import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../../fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("previews referenced and composed parameter serialization without discarding their constraints", async () => {
  platform = await startPlatform();
  const document = { openapi: "3.1.0", servers: [{ url: "https://example.test" }], components: { schemas: {
    Filter: { type: "object", properties: { name: { type: "string" } } },
    Limit: { type: "integer", minimum: 1 },
  } }, paths: Object.fromEntries([
    ["object", { $ref: "#/components/schemas/Filter" }],
    ["composed", { anyOf: [{ type: "string" }, { $ref: "#/components/schemas/Filter" }] }],
    ["limit", { allOf: [{ $ref: "#/components/schemas/Limit" }, { maximum: 5 }] }],
  ].map(([name, schema]) => [`/${name}`, { get: { operationId: name, parameters: [{ in: "query", name: "value", schema }] } }])) };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  expect(preview.groups[0].operations.map((operation: { supported: boolean }) => operation.supported)).toEqual([false, false, true]);
  expect(preview.groups[0].operations[0].reasons.join(" ")).toMatch(/parameter/i);
  const operation = preview.groups[0].operations[2];
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: preview.groups[0].id, namespace: "limits", enabled: true, operations: [{ operationId: operation.id }] }] }).expect(200);
  const service = (await platform.admin.get("/api/admin/services").expect(200)).body.services[0];
  const tool = (await platform.admin.get(`/api/admin/services/${service.id}/tools`).expect(200)).body.tools[0];
  const invalid = await platform.admin.post(`/api/admin/services/${service.id}/tools/${tool.id}/test`).send({ arguments: { query: { value: 0 } } });
  expect(invalid.body.result).toMatchObject({ isError: true });
});
