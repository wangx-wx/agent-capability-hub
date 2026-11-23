import { randomBytes, randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import { hashPassword } from "../auth/password.js";
import type { ResolveSessionUser } from "../auth/session.js";

export function registerUserRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {
  app.get("/api/admin/users", async (request, response) => {
    const actor = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
}
