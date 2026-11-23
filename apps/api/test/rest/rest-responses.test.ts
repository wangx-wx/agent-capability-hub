import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startRestSource } from "../fixtures/rest-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startRestSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("preserves text, empty and error bodies without applying examples or schema defaults", async () => {
  source = await startRestSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true }).expect(201)).body.service;
  await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "request", method: "POST", path: "/request",
    parameters: [{ in: "query", name: "label", schema: { type: "string", default: "fallback" } },
      { in: "query", name: "tags", schema: { type: "array", items: { type: "string" } }, style: "form", explode: false }],
    bodySchema: { type: "object" }, example: { query: { label: "example" }, body: { example: true } },
  }).expect(201);
  client = new Client({ name: "responses-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  source.respond({ status: 203, contentType: "text/plain", body: "unchanged\n" });
  expect(await client.callTool({ name: "rest__request", arguments: {} })).toMatchObject({ content: [{ type: "text", text: "unchanged\n" }], isError: false });
  expect(source.requests[0]).toMatchObject({ url: "/v1/request", body: undefined });
  source.respond({ status: 422, contentType: "application/json", body: '{"error":"rejected"}' });
  expect(await client.callTool({ name: "rest__request", arguments: { query: { tags: ["a", "b"] } } })).toMatchObject({ content: [{ type: "text", text: '{"error":"rejected"}' }], isError: true });
  expect(source.requests[1].url).toBe("/v1/request?tags=a%2Cb");
  source.respond({ status: 204, contentType: "text/plain", body: "" });
  expect(await client.callTool({ name: "rest__request", arguments: {} })).toMatchObject({ content: [], isError: false });
  expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["rest__request"]);
  expect((await platform.admin.get("/api/usage").expect(200)).body).toEqual({ total: 3, successful: 2, failed: 1 });
});
