import Sqlite from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { initializeDatabase } from "../../src/database/initialize.js";
import type { DatabaseSchema } from "../../src/database/schema.js";

describe("authorized demo capability listing", () => {
  let database: Kysely<DatabaseSchema> | undefined;

  afterEach(async () => {
    await database?.destroy();
    database = undefined;
  });

  it("returns the union of role grants and applies grant changes to existing keys immediately", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "administrator password" });
    const app = createApp(database);
    const admin = request.agent(app);
    await admin.post("/api/auth/login").send({ username: "root", password: "administrator password" });
    const roleA = await admin.post("/api/admin/roles").send({ name: "MCP Readers" });
    const roleB = await admin.post("/api/admin/roles").send({ name: "Skills Readers" });
    const resources = await admin.get("/api/admin/resources");
    const ids = Object.fromEntries(resources.body.resources.map((resource: { name: string; id: string }) => [resource.name, resource.id]));
    await admin.put(`/api/admin/roles/${roleA.body.role.id}/resources`).send({
      resourceIds: [ids["Demo MCP Service"], ids.demo_lookup],
    });
    await admin.put(`/api/admin/roles/${roleB.body.role.id}/resources`).send({
      resourceIds: [ids["Private Demo Skill"]],
    });
    const user = await admin.post("/api/admin/users").send({
      username: "eve",
      roleIds: [roleA.body.role.id, roleB.body.role.id],
    });
    const browser = request.agent(app);
    await browser.post("/api/auth/login").send({ username: "eve", password: user.body.initialPassword });
    const key = await browser.post("/api/keys").send({ name: "Local agent", expiresAt: null });
    const timedKey = await browser.post("/api/keys").send({ name: "CI agent", expiresAt: "2099-01-01T00:00:00.000Z" });
    const missingExpiry = await browser.post("/api/keys").send({ name: "Unspecified key" });
    const savedKeys = await browser.get("/api/keys");

    const before = await request(app).get("/api/capabilities").set("Authorization", `Bearer ${key.body.key.value}`);
    await admin.put(`/api/admin/roles/${roleB.body.role.id}/resources`).send({ resourceIds: [] });
    const after = await request(app).get("/api/capabilities").set("Authorization", `Bearer ${key.body.key.value}`);
    await browser.delete(`/api/keys/${key.body.key.id}`);
    const revoked = await request(app).get("/api/capabilities").set("Authorization", `Bearer ${key.body.key.value}`);
    const timedStillWorks = await request(app).get("/api/capabilities").set("Authorization", `Bearer ${timedKey.body.key.value}`);

    expect(key.status).toBe(201);
    expect(timedKey.status).toBe(201);
    expect(missingExpiry.status).toBe(400);
    expect(savedKeys.body.keys.map((saved: { value: string }) => saved.value)).toContain(key.body.key.value);
    expect(before.status).toBe(200);
    expect(before.body.services.map((resource: { name: string }) => resource.name)).toContain("Demo MCP Service");
    expect(before.body.tools.map((resource: { name: string }) => resource.name)).toContain("demo_lookup");
    expect(before.body.skills.map((resource: { name: string }) => resource.name)).toEqual(
      expect.arrayContaining(["Public Demo Skill", "Private Demo Skill"]),
    );
    expect(after.body.skills.map((resource: { name: string }) => resource.name)).toEqual(["Public Demo Skill"]);
    expect(revoked.status).toBe(401);
    expect(timedStillWorks.status).toBe(200);
  });
});
