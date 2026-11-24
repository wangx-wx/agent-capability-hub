import { afterEach, expect, it } from "vitest";
import { startPlatform } from "../fixtures/platform.js";
import { startMcpSource } from "../fixtures/mcp-source.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
let source: Awaited<ReturnType<typeof startMcpSource>> | undefined;

afterEach(async () => {
  await platform?.close();
  platform = undefined;
  await source?.close();
  source = undefined;
});

it("returns confirmed toolCount on admin service endpoints", async () => {
  source = await startMcpSource();
  platform = await startPlatform();

  const mcpCreated = await platform.admin
    .post("/api/admin/services")
    .send({ name: "Docs", namespace: "docs", kind: "mcp", url: source.url, enabled: true })
    .expect(201);
  expect(mcpCreated.body.service.toolCount).toBe(0);

  const restCreated = await platform.admin
    .post("/api/admin/services")
    .send({ name: "Orders", namespace: "orders", kind: "rest", url: "https://api.example.test", enabled: true })
    .expect(201);
  expect(restCreated.body.service.toolCount).toBe(0);

  // Sync preview must not publish tools before confirm.
  const preview = (await platform.admin.post(`/api/admin/services/${mcpCreated.body.service.id}/sync-preview`).expect(200)).body.preview;
  expect((await platform.admin.get(`/api/admin/services/${mcpCreated.body.service.id}`).expect(200)).body.service.toolCount).toBe(0);

  await platform.admin
    .post(`/api/admin/services/${mcpCreated.body.service.id}/sync-confirm`)
    .send({ previewId: preview.id })
    .expect(200);

  const restTool = (
    await platform.admin
      .post(`/api/admin/services/${restCreated.body.service.id}/tools`)
      .send({ name: "list-orders", method: "GET", path: "/orders" })
      .expect(201)
  ).body.tool;

  const list = (await platform.admin.get("/api/admin/services").expect(200)).body.services as Array<{ id: string; toolCount: number }>;
  expect(list.find((item) => item.id === mcpCreated.body.service.id)?.toolCount).toBe(2);
  expect(list.find((item) => item.id === restCreated.body.service.id)?.toolCount).toBe(1);

  expect((await platform.admin.get(`/api/admin/services/${mcpCreated.body.service.id}`).expect(200)).body.service.toolCount).toBe(2);

  await platform.admin.delete(`/api/admin/services/${restCreated.body.service.id}/tools/${restTool.id}`).expect(204);
  expect((await platform.admin.get(`/api/admin/services/${restCreated.body.service.id}`).expect(200)).body.service.toolCount).toBe(0);
});

it("returns userCount and grantCount on admin roles list", async () => {
  source = await startMcpSource();
  platform = await startPlatform();

  const service = (
    await platform.admin
      .post("/api/admin/services")
      .send({ name: "Docs", namespace: "docs", kind: "mcp", url: source.url, enabled: true })
      .expect(201)
  ).body.service;
  const preview = (await platform.admin.post(`/api/admin/services/${service.id}/sync-preview`).expect(200)).body.preview;
  const tools = (
    await platform.admin
      .post(`/api/admin/services/${service.id}/sync-confirm`)
      .send({ previewId: preview.id })
      .expect(200)
  ).body.tools as Array<{ id: string }>;

  const roleA = (await platform.admin.post("/api/admin/roles").send({ name: "Reader" }).expect(201)).body.role;
  const roleB = (await platform.admin.post("/api/admin/roles").send({ name: "Operator" }).expect(201)).body.role;

  await platform.admin.put(`/api/admin/roles/${roleA.id}/resources`).send({ resourceIds: [service.id, tools[0].id] }).expect(200);
  await platform.admin.put(`/api/admin/roles/${roleB.id}/resources`).send({ resourceIds: [tools[1].id] }).expect(200);

  const user1 = (await platform.admin.post("/api/admin/users").send({ username: "alice", roleIds: [roleA.id] }).expect(201)).body.user;
  await platform.admin.post("/api/admin/users").send({ username: "bob", roleIds: [roleA.id, roleB.id] }).expect(201);

  let roles = (await platform.admin.get("/api/admin/roles").expect(200)).body.roles as Array<{
    id: string;
    userCount: number;
    grantCount: number;
  }>;
  expect(roles.find((role) => role.id === roleA.id)).toMatchObject({ userCount: 2, grantCount: 2 });
  expect(roles.find((role) => role.id === roleB.id)).toMatchObject({ userCount: 1, grantCount: 1 });

  await platform.admin.put(`/api/admin/users/${user1.id}/roles`).send({ roleIds: [roleB.id] }).expect(200);
  await platform.admin.put(`/api/admin/roles/${roleA.id}/resources`).send({ resourceIds: [] }).expect(200);

  roles = (await platform.admin.get("/api/admin/roles").expect(200)).body.roles;
  expect(roles.find((role) => role.id === roleA.id)).toMatchObject({ userCount: 1, grantCount: 0 });
  expect(roles.find((role) => role.id === roleB.id)).toMatchObject({ userCount: 2, grantCount: 1 });
});
