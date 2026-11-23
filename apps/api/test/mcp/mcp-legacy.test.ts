import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
  await platform?.close();
  platform = undefined;
});

it("serves legacy SDK clients without creating an upstream session", async () => {
  platform = await startPlatform();
  client = new Client({ name: "legacy-test", version: "1.0.0" }, { versionNegotiation: { mode: "legacy" } });
  const transport = new StreamableHTTPClientTransport(platform.url, {
    requestInit: { headers: { Authorization: `Bearer ${platform.token}` } },
  });
  await client.connect(transport);
  expect(client.getNegotiatedProtocolVersion()).toBe("2025-11-25");
  expect(transport.sessionId).toBeUndefined();
  expect((await client.listTools()).tools).toEqual([]);
});

it("rejects new requests immediately after revoking a connected client's key", async () => {
  platform = await startPlatform();
  client = new Client({ name: "key-test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StreamableHTTPClientTransport(platform.url, {
    requestInit: { headers: { Authorization: `Bearer ${platform.token}` } },
  }));
  await platform.admin.delete(`/api/keys/${platform.keyId}`).expect(204);
  const response = await fetch(platform.url, {
    method: "POST", headers: { Authorization: `Bearer ${platform.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(response.status).toBe(401);
});
