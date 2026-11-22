import { createHash, randomBytes, randomUUID } from "node:crypto";
import express from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import { hashPassword, verifyPassword } from "./password.js";
import { registerApiKeyRoutes } from "./api-keys.js";
import { registerResourceRoutes } from "./resources.js";
import { registerMcpRoutes, type McpOptions } from "./mcp.js";
import { registerServiceRoutes } from "./services.js";

const sessionDurationSeconds = 12 * 60 * 60;
const sessionCookieName = "ach_session";

type AuthenticatedUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request: express.Request, name: string) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

async function getSessionUser(database: Kysely<DatabaseSchema>, request: express.Request): Promise<AuthenticatedUser | null> {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;

  const session = await database
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.userId")
    .select(["users.id", "users.username", "users.isAdmin", "users.active", "sessions.expiresAt"])
    .where("sessions.id", "=", hashSessionToken(token))
    .executeTakeFirst();
  if (!session || !session.active || session.expiresAt <= new Date().toISOString()) return null;

  return { id: session.id, username: session.username, isAdmin: Boolean(session.isAdmin) };
}

export function createApp(database: Kysely<DatabaseSchema>, options: McpOptions = {}) {
  const app = express();
  app.use(express.json());

  app.post("/api/auth/login", async (request, response) => {
    const username = typeof request.body?.username === "string" ? request.body.username.trim() : "";
    const password = typeof request.body?.password === "string" ? request.body.password : "";
    const user = await database
      .selectFrom("users")
      .select(["id", "username", "passwordHash", "isAdmin", "active"])
      .where("username", "=", username)
      .executeTakeFirst();

    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      response.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    await database
      .insertInto("sessions")
      .values({
        id: hashSessionToken(token),
        userId: user.id,
        expiresAt: new Date(now.getTime() + sessionDurationSeconds * 1000).toISOString(),
        createdAt: now.toISOString(),
      })
      .execute();

    response.cookie(sessionCookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionDurationSeconds * 1000,
    });
    response.json({ user: { id: user.id, username: user.username, isAdmin: Boolean(user.isAdmin) } });
  });

  app.get("/api/auth/me", async (request, response) => {
    const user = await getSessionUser(database, request);
    if (!user) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    response.json({ user });
  });

  app.post("/api/auth/logout", async (request, response) => {
    const token = readCookie(request, sessionCookieName);
    if (token) await database.deleteFrom("sessions").where("id", "=", hashSessionToken(token)).execute();
    response.clearCookie(sessionCookieName, { httpOnly: true, sameSite: "strict", path: "/" });
    response.status(204).end();
  });

  app.post("/api/auth/password", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    const currentPassword = typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
    const newPassword = typeof request.body?.newPassword === "string" ? request.body.newPassword : "";
    if (!currentPassword || !newPassword) {
      response.status(400).json({ error: "Current and new passwords are required" });
      return;
    }

    const account = await database.selectFrom("users").select("passwordHash").where("id", "=", actor.id).executeTakeFirst();
    if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
      response.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    await database.transaction().execute(async (transaction) => {
      await transaction.updateTable("users").set({ passwordHash: hashPassword(newPassword) }).where("id", "=", actor.id).execute();
      await transaction.deleteFrom("sessions").where("userId", "=", actor.id).execute();
    });
    response.status(204).end();
  });

  app.get("/api/admin/roles", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }

    const roles = await database.selectFrom("roles").select(["id", "name", "isAdmin"]).orderBy("name").execute();
    response.json({ roles: roles.map((role) => ({ ...role, isAdmin: Boolean(role.isAdmin) })) });
  });

  app.post("/api/admin/roles", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }

    const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
    if (!name) {
      response.status(400).json({ error: "Role name is required" });
      return;
    }
    const role = { id: randomUUID(), name, isAdmin: 0, createdAt: new Date().toISOString() };
    try {
      await database.insertInto("roles").values(role).execute();
    } catch {
      response.status(409).json({ error: "Role name already exists" });
      return;
    }
    response.status(201).json({ role: { id: role.id, name: role.name, isAdmin: false } });
  });

  app.delete("/api/admin/roles/:roleId", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    const role = await database.selectFrom("roles").select(["id", "isAdmin"]).where("id", "=", request.params.roleId).executeTakeFirst();
    if (!role) {
      response.status(404).json({ error: "Role not found" });
      return;
    }
    const assignment = await database.selectFrom("user_roles").select("userId").where("roleId", "=", role.id).executeTakeFirst();
    if (role.isAdmin || assignment) {
      response.status(409).json({ error: "Role cannot be deleted while assigned" });
      return;
    }
    await database.deleteFrom("roles").where("id", "=", role.id).execute();
    response.status(204).end();
  });

  app.get("/api/admin/users", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }

    const users = await database
      .selectFrom("users")
      .select(["id", "username", "isAdmin", "active", "createdAt"])
      .orderBy("username")
      .execute();
    const assignments = users.length
      ? await database
          .selectFrom("user_roles")
          .select(["userId", "roleId"])
          .where("userId", "in", users.map((user) => user.id))
          .execute()
      : [];
    const roleIdsByUser = new Map<string, string[]>();
    for (const assignment of assignments) {
      const roleIds = roleIdsByUser.get(assignment.userId) ?? [];
      roleIds.push(assignment.roleId);
      roleIdsByUser.set(assignment.userId, roleIds);
    }
    response.json({
      users: users.map((user) => ({
        ...user,
        isAdmin: Boolean(user.isAdmin),
        active: Boolean(user.active),
        roleIds: roleIdsByUser.get(user.id) ?? [],
      })),
    });
  });

  app.post("/api/admin/users/:userId/password", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    const user = await database
      .selectFrom("users")
      .select(["id", "isAdmin"])
      .where("id", "=", request.params.userId)
      .executeTakeFirst();
    if (!user || user.isAdmin) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    const newPassword = randomBytes(18).toString("base64url");
    await database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("users")
        .set({ passwordHash: hashPassword(newPassword) })
        .where("id", "=", user.id)
        .execute();
      await transaction.deleteFrom("sessions").where("userId", "=", user.id).execute();
    });
    response.json({ newPassword });
  });

  app.patch("/api/admin/users/:userId", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    if (typeof request.body?.active !== "boolean") {
      response.status(400).json({ error: "An active status is required" });
      return;
    }

    const user = await database.selectFrom("users").select(["id", "isAdmin"]).where("id", "=", request.params.userId).executeTakeFirst();
    if (!user || user.isAdmin) {
      response.status(404).json({ error: "User not found" });
      return;
    }
    const now = new Date().toISOString();
    await database.transaction().execute(async (transaction) => {
      await transaction.updateTable("users").set({ active: request.body.active ? 1 : 0 }).where("id", "=", user.id).execute();
      if (!request.body.active) {
        await transaction.deleteFrom("sessions").where("userId", "=", user.id).execute();
        await transaction
          .updateTable("api_keys")
          .set({ revokedAt: now })
          .where("userId", "=", user.id)
          .where("revokedAt", "is", null)
          .execute();
      }
    });
    response.status(204).end();
  });

  app.put("/api/admin/users/:userId/roles", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    const roleIds: string[] = Array.isArray(request.body?.roleIds)
      ? [...new Set<string>(request.body.roleIds.filter((id: unknown) => typeof id === "string") as string[])]
      : [];
    if (roleIds.length === 0) {
      response.status(400).json({ error: "At least one role is required" });
      return;
    }
    const user = await database.selectFrom("users").select(["id", "isAdmin"]).where("id", "=", request.params.userId).executeTakeFirst();
    if (!user || user.isAdmin) {
      response.status(404).json({ error: "User not found" });
      return;
    }
    const roles = await database.selectFrom("roles").select("id").where("id", "in", roleIds).where("isAdmin", "=", 0).execute();
    if (roles.length !== roleIds.length) {
      response.status(400).json({ error: "One or more roles are invalid" });
      return;
    }
    await database.transaction().execute(async (transaction) => {
      await transaction.deleteFrom("user_roles").where("userId", "=", user.id).execute();
      await transaction
        .insertInto("user_roles")
        .values(roleIds.map((roleId) => ({ userId: user.id, roleId })))
        .execute();
    });
    response.json({ roleIds });
  });

  app.post("/api/admin/users", async (request, response) => {
    const actor = await getSessionUser(database, request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }

    const username = typeof request.body?.username === "string" ? request.body.username.trim() : "";
    const roleIds: string[] = Array.isArray(request.body?.roleIds)
      ? [...new Set<string>(request.body.roleIds.filter((id: unknown) => typeof id === "string") as string[])]
      : [];
    if (!username || roleIds.length === 0) {
      response.status(400).json({ error: "Username and at least one role are required" });
      return;
    }
    const roles = await database.selectFrom("roles").select("id").where("id", "in", roleIds).where("isAdmin", "=", 0).execute();
    if (roles.length !== roleIds.length) {
      response.status(400).json({ error: "One or more roles are invalid" });
      return;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const initialPassword = randomBytes(18).toString("base64url");
    try {
      await database.transaction().execute(async (transaction) => {
        await transaction
          .insertInto("users")
          .values({ id, username, passwordHash: hashPassword(initialPassword), isAdmin: 0, active: 1, createdAt: now })
          .execute();
        await transaction
          .insertInto("user_roles")
          .values(roleIds.map((roleId: string) => ({ userId: id, roleId })))
          .execute();
      });
    } catch {
      response.status(409).json({ error: "Username already exists" });
      return;
    }
    response.status(201).json({ user: { id, username, isAdmin: false, active: true, roleIds }, initialPassword });
  });

  app.get("/api/health", async (_request, response) => {
    try {
      await database.selectNoFrom((expression) => expression.lit(1).as("value")).executeTakeFirst();
      response.json({ status: "ok", database: "ok" });
    } catch {
      response.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  registerResourceRoutes(app, database, (request) => getSessionUser(database, request));
  registerApiKeyRoutes(app, database, (request) => getSessionUser(database, request));
  registerServiceRoutes(app, database, (request) => getSessionUser(database, request));
  app.locals.closeMcp = registerMcpRoutes(app, database, options);

  return app;
}
