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

it("executes confirmed REST mappings with grouped inputs and protected service headers", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true,
    headers: { Authorization: "Bearer service-token" } }).expect(201)).body.service;
  await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "update-user", description: "Update a user", method: "POST", path: "/users/{id}",
    parameters: [
      { in: "path", name: "id", required: true, schema: { type: "string" } },
      { in: "query", name: "tags", schema: { type: "array", items: { type: "string" } }, style: "form", explode: true },
      { in: "query", name: "count", schema: { type: "integer" } },
      { in: "header", name: "X-Tenant", schema: { type: "string" } },
      { in: "header", name: "Authorization", schema: { type: "string" } },
    ], bodySchema: { type: "object", properties: { active: { type: "boolean" } }, required: ["active"], additionalProperties: false }, bodyRequired: true,
    example: { body: { active: true } },
  }).expect(201);
  expect(source.requests).toEqual([]);
  client = new Client({ name: "rest-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect(await client.callTool({ name: "rest__update-user", arguments: {
    path: { id: "a/b" }, query: { tags: ["one", "two"], count: 0 }, headers: { "X-Tenant": "team", Authorization: "Bearer input" }, body: { active: false },
  } })).toMatchObject({ content: [{ type: "text", text: '{ "accepted": true }' }] });
  expect(source.requests).toEqual([{ method: "POST", url: "/v1/users/a%2Fb?tags=one&tags=two&count=0", authorization: "Bearer service-token", tenant: "team", body: { active: false } }]);
  expect((await platform.admin.get("/api/usage").expect(200)).body).toEqual({ total: 1, successful: 1, failed: 0 });
});
