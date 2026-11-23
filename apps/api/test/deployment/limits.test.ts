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

it("enforces deployment request, streamed response and schema budgets before further work", async () => {
  source = await startRestSource();
  platform = await startPlatform({ limits: { requestBytes: 2048, responseBytes: 256, schemaDepth: 8 } });
  const service = (await platform.admin.post("/api/admin/services").send({ name: "REST", kind: "rest", url: source.url, enabled: true }).expect(201)).body.service;
  await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "read", method: "GET", path: "/read" }).expect(201);
  client = new Client({ name: "limits-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  source.respond({ status: 200, contentType: "text/plain", body: "x".repeat(512) });
  expect(await client.callTool({ name: "rest__read", arguments: {} })).toMatchObject({ isError: true });
  const oversized = await fetch(platform.url, { method: "POST", headers: { Authorization: `Bearer ${platform.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "rest__read", arguments: { text: "x".repeat(4096) } } }),
  });
  expect(oversized.status).toBe(413);
  const invalid = await platform.admin.post(`/api/admin/services/${service.id}/tools`).send({ name: "deep", method: "POST", path: "/deep",
    bodySchema: { type: "object", properties: { a: { type: "object", properties: { b: { type: "object", properties: { c: { type: "object" } } } } } } },
  }).expect(400);
  expect(invalid.body.error).toMatch(/depth/i);
  expect(source.requests).toHaveLength(1);
});
