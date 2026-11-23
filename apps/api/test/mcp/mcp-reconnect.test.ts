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

it("reconnects after a network failure without replaying the call or changing the confirmed catalog", async () => {
  source = await startMcpSource(); platform = await startPlatform();
  const service = (await platform.admin.post("/api/admin/services").send({ name: "Docs", kind: "mcp", url: source.url, enabled: true, timeoutSeconds: 2 }).expect(201)).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  await platform.admin.post(`/api/admin/services/${service.id}/sync-confirm`).send({ previewId: preview.id }).expect(200);
  client = new Client({ name: "reconnect-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  const port = source.port;
  await source.close(); source = undefined;
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "failed once" } })).toMatchObject({ isError: true });
  expect((await platform.admin.get(`/api/admin/services/${service.id}`).expect(200)).body.service.connectionStatus).toBe("disconnected");
  source = await startMcpSource(port);
  source.tools.splice(1, 1);
  await expect.poll(async () => (await platform!.admin.get(`/api/admin/services/${service.id}`).expect(200)).body.service.connectionStatus, { timeout: 5000 }).toBe("connected");
  expect(source.calls).toEqual([]);
  expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["docs__count", "docs__echo"]);
  expect(await client.callTool({ name: "docs__echo", arguments: { text: "fresh" } })).toMatchObject({ content: [{ type: "text", text: "fresh" }] });
});
