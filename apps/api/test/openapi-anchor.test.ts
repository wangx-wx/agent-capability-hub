import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startRestSource } from "./fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("retains recursive internal anchors as self-contained references in imported tool schemas", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const document = { openapi: "3.1.0", servers: [{ url: source.url }], components: { schemas: { Node: {
    $anchor: "node", type: "object", required: ["label"], properties: { label: { type: "string", minLength: 2 }, child: { $ref: "#node" } }, additionalProperties: false,
  } } }, paths: { "/nodes": { post: { operationId: "node", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Node" } } } } } } } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  const group = preview.groups[0], operation = group.operations[0];
  expect(operation.supported, operation.reasons.join(" ")).toBe(true);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, namespace: "tree", enabled: true, operations: [{ operationId: operation.id }] }] }).expect(200);
  const service = (await platform.admin.get("/api/admin/services").expect(200)).body.services[0];
  const tool = (await platform.admin.get(`/api/admin/services/${service.id}/tools`).expect(200)).body.tools[0];
  const trial = `/api/admin/services/${service.id}/tools/${tool.id}/test`;
  expect((await platform.admin.post(trial).send({ arguments: { body: { label: "root", child: { label: "leaf" } } } }).expect(200)).body.result.isError).toBe(false);
  expect((await platform.admin.post(trial).send({ arguments: { body: { label: "root", child: { label: "x" } } } }).expect(200)).body.result.isError).toBe(true);
  expect(source.requests).toHaveLength(1);
});
