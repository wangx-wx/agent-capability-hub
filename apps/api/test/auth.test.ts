import Sqlite from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import request from "supertest";
import { createApp } from "../src/app.js";
import { initializeDatabase } from "../src/database.js";
import type { DatabaseSchema } from "../src/database.js";

describe("account login", () => {
  let database: Kysely<DatabaseSchema> | undefined;

  afterEach(async () => {
    await database?.destroy();
    database = undefined;
  });

  it("lets the initialized administrator sign in and keeps a 12-hour session", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "correct horse battery staple" });
    const app = createApp(database);

    const browser = request.agent(app);
    const login = await browser.post("/api/auth/login").send({
      username: "root",
      password: "correct horse battery staple",
    });
    const session = await browser.get("/api/auth/me");

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"][0]).toContain("Max-Age=43200");
    expect(session.status).toBe(200);
    expect(session.body.user).toMatchObject({ username: "root", isAdmin: true });
  });

  it("lets the administrator create a role and a user with a generated initial password", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "correct horse battery staple" });
    const browser = request.agent(createApp(database));
    await browser.post("/api/auth/login").send({ username: "root", password: "correct horse battery staple" });

    const roleResponse = await browser.post("/api/admin/roles").send({ name: "Analyst" });
    const userResponse = await browser.post("/api/admin/users").send({
      username: "alice",
      roleIds: [roleResponse.body.role.id],
    });
    const userLogin = await request(createApp(database)).post("/api/auth/login").send({
      username: "alice",
      password: userResponse.body.initialPassword,
    });

    expect(roleResponse.status).toBe(201);
    expect(userResponse.status).toBe(201);
    expect(userResponse.body.initialPassword).toEqual(expect.any(String));
    expect(userLogin.status).toBe(200);
    expect(userLogin.body.user).toMatchObject({ username: "alice", isAdmin: false });
  });

  it("revokes every web session when a user changes their password", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "administrator password" });
    const app = createApp(database);
    const admin = request.agent(app);
    await admin.post("/api/auth/login").send({ username: "root", password: "administrator password" });
    const role = await admin.post("/api/admin/roles").send({ name: "Operator" });
    const created = await admin.post("/api/admin/users").send({ username: "bob", roleIds: [role.body.role.id] });
    const user = request.agent(app);
    await user.post("/api/auth/login").send({ username: "bob", password: created.body.initialPassword });

    const change = await user.post("/api/auth/password").send({
      currentPassword: created.body.initialPassword,
      newPassword: "a different password",
    });
    const oldSession = await user.get("/api/auth/me");
    const oldPasswordLogin = await request(app).post("/api/auth/login").send({
      username: "bob",
      password: created.body.initialPassword,
    });
    const newPasswordLogin = await request(app).post("/api/auth/login").send({
      username: "bob",
      password: "a different password",
    });

    expect(change.status).toBe(204);
    expect(oldSession.status).toBe(401);
    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
  });

  it("blocks a disabled user immediately and allows the account to be re-enabled", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });
    await initializeDatabase(database, { adminUsername: "root", adminPassword: "administrator password" });
    const app = createApp(database);
    const admin = request.agent(app);
    await admin.post("/api/auth/login").send({ username: "root", password: "administrator password" });
    const role = await admin.post("/api/admin/roles").send({ name: "Operator" });
    const created = await admin.post("/api/admin/users").send({ username: "carol", roleIds: [role.body.role.id] });
    const user = request.agent(app);
    await user.post("/api/auth/login").send({ username: "carol", password: created.body.initialPassword });

    const deactivated = await admin.patch(`/api/admin/users/${created.body.user.id}`).send({ active: false });
    const oldSession = await user.get("/api/auth/me");
    const blockedLogin = await request(app).post("/api/auth/login").send({ username: "carol", password: created.body.initialPassword });
    const reactivated = await admin.patch(`/api/admin/users/${created.body.user.id}`).send({ active: true });
    const restoredLogin = await request(app).post("/api/auth/login").send({ username: "carol", password: created.body.initialPassword });

    expect(deactivated.status).toBe(204);
    expect(oldSession.status).toBe(401);
    expect(blockedLogin.status).toBe(401);
    expect(reactivated.status).toBe(204);
    expect(restoredLogin.status).toBe(200);
  });
});
