import request from "supertest";
import { afterEach, expect, it } from "vitest";
import { createDatabase } from "../../src/database/client.js";
import { startPlatform } from "../fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; });

async function auditFixture() {
  const database = createDatabase(":memory:");
  platform = await startPlatform(undefined, database);
  const adminId = (await platform.admin.get("/api/auth/me").expect(200)).body.user.id as string;
  const role = (await platform.admin.post("/api/admin/roles").send({ name: "Audit Reader" }).expect(201)).body.role;
  const created = (await platform.admin.post("/api/admin/users").send({ username: "alice", roleIds: [role.id] }).expect(201)).body;
  const alice = request.agent(platform.app);
  await alice.post("/api/auth/login").send({ username: "alice", password: created.initialPassword }).expect(200);
  await database.insertInto("audit").values([
    { id: "a1", userId: adminId, username: "root", serviceName: "Alpha", toolName: "alpha__echo", clientName: "Codex", createdAt: "2026-11-26T00:00:00.000Z", status: "succeeded" as const, durationMs: 100 },
    { id: "a2", userId: adminId, username: "root", serviceName: "Alpha", toolName: "alpha__count", clientName: "Claude", createdAt: "2026-11-26T01:00:00.000Z", status: "failed" as const, durationMs: 300 },
    { id: "a3", userId: created.user.id as string, username: "alice", serviceName: "Alpha", toolName: "alpha__echo", clientName: "Codex", createdAt: "2026-11-26T02:00:00.000Z", status: "succeeded" as const, durationMs: 200 },
    { id: "a4", userId: adminId, username: "root", serviceName: "Beta", toolName: "beta__echo", clientName: "Codex", createdAt: "2026-11-26T03:00:00.000Z", status: "unknown" as const, durationMs: null },
    { id: "a5", userId: adminId, username: "root", serviceName: "Alpha", toolName: "alpha__echo", clientName: "Codex", createdAt: "2026-11-26T04:00:00.000Z", status: "running" as const, durationMs: null },
  ].map((row) => ({ ...row, keyId: null, serviceId: null, toolId: null, clientVersion: null }))).execute();
  return { database, admin: platform.admin, alice };
}

it("combines independent audit filters with an inclusive start and exclusive end across time zones", async () => {
  const { admin } = await auditFixture();
  const result = (await admin.get("/api/admin/audit").query({
    from: "2026-11-26T08:00:00+08:00", to: "2026-11-26T10:00:00+08:00",
    username: "ROOT", serviceName: "ALP", toolName: "echo", clientName: "cod", status: "succeeded", q: "alpha",
  }).expect(200)).body;
  expect(result).toMatchObject({ records: [{ id: "a1" }], total: 1, hasMore: false });
  expect(result.records).toHaveLength(1);
});

it("rejects invalid calendar dates, missing time zones and reversed audit ranges", async () => {
  const { admin } = await auditFixture();
  for (const query of [
    { from: "2026-02-30T00:00:00Z" },
    { to: "not-a-date" },
    { from: "2026-11-26T00:00:00" },
    { from: "2026-11-26T24:00:00Z" },
    { from: "2026-11-27T00:00:00Z", to: "2026-11-26T00:00:00Z" },
    { from: "2026-11-26T00:00:00Z", to: "2026-11-26T00:00:00Z" },
  ]) {
    const response = await admin.get("/api/admin/audit").query(query);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid audit time range");
  }
});

it("keeps personal audit queries private and treats text wildcards literally", async () => {
  const { database, admin, alice } = await auditFixture();
  const own = (await alice.get("/api/admin/audit").query({ serviceName: "Alpha", userId: "ignored", from: "2026-11-26T00:00:00Z" }).expect(200)).body;
  expect(own.records.map((row: { id: string }) => row.id)).toEqual(["a3"]);
  expect((await alice.get("/api/admin/audit").query({ username: "root" }).expect(200)).body.total).toBe(0);
  expect((await admin.get("/api/admin/audit").query({ to: "2026-11-26T02:00:00Z" }).expect(200)).body.total).toBe(2);
  expect((await admin.get("/api/admin/audit").query({ from: "2026-11-26T02:00:00Z" }).expect(200)).body.total).toBe(3);
  await database.insertInto("audit").values({
    id: "literal", userId: "historical", username: "User_%", serviceName: "Service_%", toolName: "tool_%", clientName: "Client_%",
    keyId: null, serviceId: null, toolId: null, clientVersion: null, createdAt: "2026-11-26T05:00:00.000Z", status: "succeeded", durationMs: 0,
  }).execute();
  for (const field of ["username", "serviceName", "toolName", "clientName", "q"]) {
    const result = (await admin.get("/api/admin/audit").query({ [field]: "_%" }).expect(200)).body;
    expect(result.records.map((row: { id: string }) => row.id)).toEqual(["literal"]);
  }
});
