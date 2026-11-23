import { readFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startRestSource } from "./fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("preserves OpenAPI 3.0 nullable, enum, exclusive bounds and request-only required semantics", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const text = (await readFile(new URL("./fixtures/openapi-3.0.yaml", import.meta.url), "utf8")).replace("__SERVER__", source.url);
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text }).expect(200)).body.preview;
  const group = preview.groups[0];
  const operation = group.operations[0];
  expect(operation.supported, JSON.stringify(operation.reasons)).toBe(true);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, namespace: "legacy", enabled: true, operations: [{ operationId: operation.id }] }] }).expect(200);
  client = new Client({ name: "legacy-schema-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect(await client.callTool({ name: "legacy__create-item", arguments: { body: { name: null, amount: 1 } } })).toMatchObject({ isError: false });
  for (const body of [{ name: "x", amount: 1 }, { name: "ok", amount: 0 }, { name: "ok", amount: 10 }, { name: null, status: null }]) {
    expect(await client.callTool({ name: "legacy__create-item", arguments: { body } })).toMatchObject({ isError: true });
  }
  expect(source.requests).toHaveLength(1);
  expect(source.requests[0].body).toEqual({ name: null, amount: 1 });
});
