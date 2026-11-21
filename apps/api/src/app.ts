import { createHash, randomBytes, randomUUID } from "node:crypto";
import express from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import { hashPassword, verifyPassword } from "./password.js";

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

export function createApp(database: Kysely<DatabaseSchema>) {
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
    response.json({ users: users.map((user) => ({ ...user, isAdmin: Boolean(user.isAdmin), active: Boolean(user.active) })) });
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

  return app;
}
