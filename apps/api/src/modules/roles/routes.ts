import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import type { ResolveSessionUser } from "../auth/session.js";

export function registerRoleRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {
  app.get("/api/admin/roles", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }

    const [roles, userCounts, grantCounts] = await Promise.all([
      database.selectFrom("roles").select(["id", "name", "isAdmin"]).orderBy("name").execute(),
      database.selectFrom("user_roles").select(["roleId", (eb) => eb.fn.countAll<number>().as("count")]).groupBy("roleId").execute(),
      database.selectFrom("role_resources").select(["roleId", (eb) => eb.fn.countAll<number>().as("count")]).groupBy("roleId").execute(),
    ]);
    const usersByRole = new Map(userCounts.map((row) => [row.roleId, Number(row.count)]));
    const grantsByRole = new Map(grantCounts.map((row) => [row.roleId, Number(row.count)]));
    response.json({
      roles: roles.map((role) => ({
        ...role,
        isAdmin: Boolean(role.isAdmin),
        userCount: usersByRole.get(role.id) ?? 0,
        grantCount: grantsByRole.get(role.id) ?? 0,
      })),
    });
  });

  app.post("/api/admin/roles", async (request, response) => {
    const actor = await resolveUser(request);
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
    const actor = await resolveUser(request);
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
}
