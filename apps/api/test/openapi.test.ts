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

it("groups OpenAPI targets and preserves recursive schemas while excluding unsupported operations", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const document = { openapi: "3.1.0", info: { title: "Nodes", version: "1.0" }, servers: [{ url: source.url }], paths: {
    "/nodes/{id}": { parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }, { in: "query", name: "id", schema: { type: "string" } }],
      post: { operationId: "create-node", parameters: [{ in: "query", name: "id", schema: { type: "integer", minimum: 0 } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Node" } } } }, responses: { "200": { description: "Created" } } } },
    "/info": { get: { operationId: "info", servers: [{ url: `${source.url}/alternate` }], responses: { "200": { description: "Info" } } } },
    "/cookie": { get: { operationId: "cookie", parameters: [{ in: "cookie", name: "session", schema: { type: "string" } }], responses: { "200": { description: "Cookie" } } } },
    "/external": { post: { operationId: "external", requestBody: { content: { "application/json": { schema: { $ref: "https://example.invalid/schema.json" } } } }, responses: { "200": { description: "External" } } } },
  }, components: { schemas: { Node: { type: "object", properties: { label: { type: "string", minLength: 3 }, child: { $ref: "#/components/schemas/Node" } }, required: ["label"], additionalProperties: false } } } };
  const preview = (await platform.admin.post("/api/admin/imports/preview").send({ kind: "openapi", text: JSON.stringify(document) }).expect(200)).body.preview;
  expect(preview.groups.map((group: { url: string }) => group.url)).toEqual([source.url, `${source.url}/alternate`]);
  const group = preview.groups[0];
  const operation = group.operations.find((operation: { definition: { name: string } }) => operation.definition.name === "create-node");
  const unsupported = group.operations.filter((operation: { supported: boolean }) => !operation.supported);
  expect(operation.supported).toBe(true);
  expect(unsupported).toHaveLength(2);
  expect(unsupported.every((operation: { reasons: string[] }) => operation.reasons.length > 0)).toBe(true);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, namespace: "nodes", operations: [{ operationId: unsupported[0].id }] }] }).expect(400);
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toEqual([]);
  expect(source.requests).toEqual([]);
  await platform.admin.post("/api/admin/imports/confirm").send({ previewId: preview.id, groups: [{ groupId: group.id, name: "Nodes", namespace: "nodes", enabled: true, operations: [{ operationId: operation.id }] }] }).expect(200);
  client = new Client({ name: "openapi-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect(await client.callTool({ name: "nodes__create-node", arguments: { path: { id: "a/b" }, query: { id: 0 }, body: { label: "root", child: { label: "leaf" } } } })).toMatchObject({ isError: false });
  expect(await client.callTool({ name: "nodes__create-node", arguments: { path: { id: "a" }, body: { label: "x" } } })).toMatchObject({ isError: true });
  expect(source.requests).toHaveLength(1);
  expect(source.requests[0]).toMatchObject({ url: "/v1/nodes/a%2Fb?id=0", body: { label: "root", child: { label: "leaf" } } });
});
