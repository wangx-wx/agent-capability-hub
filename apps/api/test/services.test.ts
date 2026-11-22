import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

it("lets an administrator save an unreachable MCP service without publishing tools", async () => {
  platform = await startPlatform();
  const created = await platform.admin.post("/api/admin/services").send({
    name: "Offline Docs", kind: "mcp", url: "http://127.0.0.1:1/mcp", transport: "http",
    headers: { Authorization: "Bearer downstream-secret" },
  }).expect(201);
  const saved = await platform.admin.get(`/api/admin/services/${created.body.service.id}`).expect(200);
  expect(saved.body.service).toMatchObject({
    id: created.body.service.id, name: "Offline Docs", namespace: "offline-docs", kind: "mcp",
    connectionStatus: "disconnected", enabled: false, timeoutSeconds: 60,
    headers: { Authorization: "Bearer downstream-secret" },
  });
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toHaveLength(1);
});
