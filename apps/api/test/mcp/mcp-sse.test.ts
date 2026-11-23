import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startSseSource } from "../fixtures/sse-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startSseSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("injects static credentials into SSE GET and POST while preserving native media results", async () => {
  source = await startSseSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Legacy", kind: "mcp", transport: "sse", url: source.url,
    headers: { Authorization: "Bearer sse-secret" }, enabled: true }).expect(201)).body.service;
  const discovered = await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`);
  expect(discovered.status, JSON.stringify(discovered.body)).toBe(200);
  const preview = discovered.body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "sse-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect(await client.callTool({ name: "legacy__echo", arguments: { text: "native" } })).toMatchObject({
    content: [{ type: "text", text: "native" }, { type: "image", data: "aGVsbG8=", mimeType: "image/png" }],
    structuredContent: { source: "legacy" },
  });
  expect(source.requests.some((row) => row.method === "GET")).toBe(true);
  expect(source.requests.some((row) => row.method === "POST")).toBe(true);
  expect(source.requests.every((row) => row.authorization === "Bearer sse-secret")).toBe(true);
  await client.close(); client = undefined;
  await platform.close(); platform = undefined;
  await expect.poll(() => source!.connectionCount).toBe(0);
});
