import { readFile } from "node:fs/promises";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../../fixtures/platform.js";
import { startDocumentSource } from "../../fixtures/document-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startDocumentSource>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("accepts URL and uploaded document content and resolves servers from the final document URL", async () => {
  const text = (await readFile(new URL("../../fixtures/openapi-3.0.yaml", import.meta.url), "utf8")).replace("__SERVER__", "./v1");
  source = await startDocumentSource(text); platform = await startPlatform();
  const remote = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", url: source.url }).expect(200)).body.preview;
  expect(remote.groups[0].url).toBe(`${source.origin}/definitions/v1`);
  expect(remote.groups[0].operations[0].supported).toBe(true);
  expect(source.requests).toEqual(["/redirect/latest", "/definitions/spec.yaml"]);
  const uploaded = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", file: { name: "items.yaml", content: text }, baseUrl: source.finalUrl }).expect(200)).body.preview;
  expect(uploaded.groups[0].url).toBe(`${source.origin}/definitions/v1`);
  expect(uploaded.groups[0].operations[0].supported).toBe(true);
  expect(source.requests).toHaveLength(2);
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toEqual([]);
});
