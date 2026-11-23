import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("reports unsupported schema dialects and required vocabularies in import previews", async () => {
  platform = await startPlatform();
  const document = { openapi: "3.1.0", servers: [{ url: "https://example.test" }], paths: {
    "/supported": { post: { requestBody: { content: { "application/json": { schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" } } } } } },
    "/vocabulary": { post: { requestBody: { content: { "application/json": { schema: { type: "object", $vocabulary: { "https://example.test/custom-constraints": true }, customConstraint: 1 } } } } } },
  } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  expect(preview.groups[0].operations.map((operation: { supported: boolean }) => operation.supported)).toEqual([true, false]);
  expect(preview.groups[0].operations[1].reasons.join(" ")).toMatch(/vocabulary/i);
  const custom = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify({ ...document, jsonSchemaDialect: "https://example.test/custom-dialect" }) }).expect(200)).body.preview;
  expect(custom.groups[0].operations.map((operation: { supported: boolean }) => operation.supported)).toEqual([true, false]);
  expect(custom.groups[0].operations[1].reasons.join(" ")).toMatch(/dialect/i);
});
