import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it, vi } from "vitest";
import { startPlatform } from "./fixtures/platform.js";
import { startMcpSource } from "./fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;
let client: Client | undefined;
let release: (() => void) | undefined;
afterEach(async () => { release?.(); release = undefined; await client?.close(); client = undefined; await platform?.close(); platform = undefined; await source?.close(); source = undefined; });

it("attempts to propagate caller cancellation downstream without replaying the tool", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "timeout-test", version: "1" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  const hold = source.holdCalls(); release = hold.release;
  const controller = new AbortController();
  const call = client.callTool({ name: "docs__echo", arguments: { text: "once" } }, { signal: controller.signal }).catch((error: Error) => error);
  await hold.started;
  controller.abort();
  expect(await call).toBeInstanceOf(Error);
  await vi.waitFor(() => expect(source!.cancellations).toEqual(["echo"]));
  hold.release();
  expect(source.calls).toHaveLength(1);
  await vi.waitFor(async () => expect((await platform!.admin.get("/api/usage").expect(200)).body).toEqual({ total: 1, successful: 0, failed: 1 }));
}, 10_000);
