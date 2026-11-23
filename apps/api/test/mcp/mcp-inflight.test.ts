import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close(); client = undefined;
  await platform?.close(); platform = undefined;
  await source?.close(); source = undefined;
});

it("lets an issued call finish after disabling its service while rejecting new calls", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "inflight-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  const hold = source.holdCalls();
  const inflight = client.callTool({ name: "docs__echo", arguments: { text: "issued" } });
  await hold.started;
  await platform.admin.patch(`/api/admin/services/${service.id}`).send({ enabled: false }).expect(200);
  hold.release();
  const completed = await inflight;
  expect(completed.content).toEqual([{ type: "text", text: "issued" }]);
  expect(completed.isError).not.toBe(true);
  expect((await client.listTools()).tools).toEqual([]);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "new" } })).toMatchObject({ isError: true });
  expect(source.calls).toHaveLength(1);
});
