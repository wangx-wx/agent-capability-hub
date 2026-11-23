import { randomBytes } from "node:crypto";
import type { Express } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import { hashPassword, verifyPassword } from "./password.js";
import { hashSessionToken, readCookie, sessionCookieName, sessionDurationSeconds, type ResolveSessionUser } from "./session.js";

export function registerAuthRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {
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
    const user = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
}
