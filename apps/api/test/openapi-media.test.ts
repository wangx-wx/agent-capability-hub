import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startRestSource } from "./fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("sends the declared JSON media type for an imported REST request", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const document = { openapi: "3.1.0", servers: [{ url: source.url }], paths: { "/patch": { patch: { operationId: "patch", requestBody: { required: true, content: { "application/merge-patch+json": { schema: { type: "object" } } } } } } } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  const group = preview.groups[0];
  const result = (await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, namespace: "media", enabled: true, operations: [{ operationId: group.operations[0].id }] }] }).expect(200)).body.groups[0];
  await platform.admin.post(`/api/admin/services/${result.service.id}/tools/${result.tools[0].id}/test`).send({ arguments: { body: { active: false } } }).expect(200);
  expect(source.contentTypes).toEqual(["application/merge-patch+json"]);
  expect(source.requests[0].body).toEqual({ active: false });
});
