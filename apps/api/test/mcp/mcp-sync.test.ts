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

it("publishes all discovered pages only after administrator confirmation", async () => {
  source = await startMcpSource();
  platform = await startPlatform();
  const created = await platform.admin.post("/api/admin/services").send({ name: "Docs", namespace: "docs", kind: "mcp", url: source.url, enabled: true }).expect(201);
  const id = created.body.service.id;
  const preview = await platform.admin.post(`/api/admin/services/${id}/sync-preview`).expect(200);
  expect(preview.body.preview.added.map((tool: { name: string }) => tool.name)).toEqual(["docs__echo", "docs__count"]);
  client = new Client({ name: "sync-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, { requestInit: { headers: { Authorization: `Bearer ${platform.token}` } } }));
  expect((await client.listTools()).tools).toEqual([]);
  await platform.admin.post(`/api/admin/services/${id}/sync-confirm`).send({ previewId: preview.body.preview.id }).expect(200);
  expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["docs__count", "docs__echo"]);
  expect((await platform.admin.get(`/api/admin/services/${id}/tools`).expect(200)).body.tools).toHaveLength(2);
});
