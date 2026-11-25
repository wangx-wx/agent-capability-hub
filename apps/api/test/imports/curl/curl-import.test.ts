import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../../fixtures/platform.js";
import { startRestSource } from "../../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("previews cURL parameters and service credentials without publishing until administrator confirmation", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const text = `curl '${source.url}/users/42?limit=001' -X POST -H 'Authorization: Bearer imported-secret' -H 'X-Tenant: team' -H 'Content-Type: application/json' --data-raw '{"active":false}'`;
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "curl", text }).expect(200)).body.preview;
  const group = preview.groups[0];
  const operation = group.operations[0];
  expect(operation.supported).toBe(true);
  expect(operation.definition.path).toBe("/v1/users/42");
  expect(operation.definition.parameters).toContainEqual({ in: "query", name: "limit", schema: { type: "string" } });
  expect(group.headers.Authorization).toBe("Bearer imported-secret");
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toEqual([]);
  expect(source.requests).toEqual([]);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id,
    name: "Imported", namespace: "imported", headers: group.headers, enabled: true,
    operations: [{ operationId: operation.id, definition: { ...operation.definition, name: "update" } }],
  }] }).expect(200);
  client = new Client({ name: "import-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect(await client.callTool({ name: "imported__update", arguments: operation.definition.example })).toMatchObject({ content: [{ type: "text", text: '{ "accepted": true }' }] });
  expect(source.requests).toEqual([{ method: "POST", url: "/v1/users/42?limit=001", authorization: "Bearer imported-secret", tenant: "team", body: { active: false } }]);
});

it("parses headers from a multiline cURL command", async () => {
  platform = await startPlatform();
  const text = [
    "curl --url 'https://eip.example/gw/lc/api/tc-db-dict/getCurrentUserDbDictList'",
    "-H 'Accept: application/json, text/plain, /'",
    "-H 'ram-system: system-test'",
    "-H 'ram-token: token-test'",
  ].join("\n");
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "curl", text }).expect(200)).body.preview;
  const operation = preview.groups[0].operations[0];
  expect(operation.definition.parameters).toEqual([
    { in: "header", name: "Accept", schema: { type: "string" } },
    { in: "header", name: "ram-system", schema: { type: "string" } },
    { in: "header", name: "ram-token", schema: { type: "string" } },
  ]);
  expect(operation.definition.example.headers).toEqual({
    Accept: "application/json, text/plain, /",
    "ram-system": "system-test",
    "ram-token": "token-test",
  });
});
