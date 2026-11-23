import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
let release: (() => void) | undefined;
afterEach(async () => { release?.(); release = undefined; await client?.close(); client = undefined; await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("times out an issued tool call without automatically sending it again", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true, timeoutSeconds: 1 }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "timeout-test", version: "1" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  const hold = source.holdCalls(); release = hold.release;
  const call = client.callTool({ name: "docs__echo", arguments: { text: "once" } });
  await hold.started;
  expect(await call).toMatchObject({ isError: true });
  hold.release();
  expect(source.calls).toHaveLength(1);
  expect((await platform.admin.get("/api/usage").expect(200)).body).toEqual({ total: 1, successful: 0, failed: 1 });
}, 10_000);
