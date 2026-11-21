import type { Express, Request, Response } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";

interface SessionUser {
  id: string;
  isAdmin: boolean;
}

type ResolveSessionUser = (request: Request) => Promise<SessionUser | null>;

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function denyUnlessAdmin(response: Response, actor: SessionUser | null) {
  if (!actor) {
    response.status(401).json({ error: "Authentication required" });
    return true;
  }
  if (!actor.isAdmin) {
    response.status(403).json({ error: "Administrator access required" });
    return true;
  }
  return false;
}

export function registerResourceRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {
  app.get("/api/admin/resources", async (request, response) => {
    const actor = await resolveUser(request);
    if (denyUnlessAdmin(response, actor)) return;
    const resources = await database
      .selectFrom("resources")
      .select(["id", "type", "visibility", "parentId", "name", "description"])
      .orderBy("type")
      .orderBy("name")
      .execute();
    response.json({ resources });
  });

  app.get("/api/admin/roles/:roleId/resources", async (request, response) => {
    const actor = await resolveUser(request);
    if (denyUnlessAdmin(response, actor)) return;
    const role = await database.selectFrom("roles").select("id").where("id", "=", request.params.roleId).executeTakeFirst();
    if (!role) {
      response.status(404).json({ error: "Role not found" });
      return;
    }
    const grants = await database
      .selectFrom("role_resources")
      .select("resourceId")
      .where("roleId", "=", role.id)
      .execute();
    response.json({ resourceIds: grants.map((grant) => grant.resourceId) });
  });

  app.put("/api/admin/roles/:roleId/resources", async (request, response) => {
    const actor = await resolveUser(request);
    if (denyUnlessAdmin(response, actor)) return;
    if (!isStringList(request.body?.resourceIds)) {
      response.status(400).json({ error: "Resource ids are required" });
      return;
    }
    const resourceIds = [...new Set<string>(request.body.resourceIds as string[])];
    const role = await database.selectFrom("roles").select(["id", "isAdmin"]).where("id", "=", request.params.roleId).executeTakeFirst();
    if (!role || role.isAdmin) {
      response.status(404).json({ error: "Role not found" });
      return;
    }
    const resources = resourceIds.length
      ? await database.selectFrom("resources").select("id").where("id", "in", resourceIds).execute()
      : [];
    if (resources.length !== resourceIds.length) {
      response.status(400).json({ error: "One or more resources are invalid" });
      return;
    }
    await database.transaction().execute(async (transaction) => {
      await transaction.deleteFrom("role_resources").where("roleId", "=", role.id).execute();
      if (resourceIds.length) {
        await transaction.insertInto("role_resources").values(resourceIds.map((resourceId) => ({ roleId: role.id, resourceId }))).execute();
      }
    });
    response.json({ resourceIds });
  });

  app.get("/api/capabilities", async (request, response) => {
    const authorization = request.header("authorization") ?? "";
    const keyValue = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const now = new Date().toISOString();
    const key = keyValue
      ? await database
          .selectFrom("api_keys")
          .innerJoin("users", "users.id", "api_keys.userId")
          .select(["api_keys.id as keyId", "users.id as userId", "users.isAdmin", "users.active", "api_keys.expiresAt"])
          .where("api_keys.value", "=", keyValue)
          .where("api_keys.revokedAt", "is", null)
          .executeTakeFirst()
      : undefined;
    if (!key || !key.active || (key.expiresAt !== null && key.expiresAt <= now)) {
      response.status(401).json({ error: "Invalid or expired API Key" });
      return;
    }

    const resources = await database.selectFrom("resources").selectAll().execute();
    const allowed = key.isAdmin
      ? new Set(resources.map((resource) => resource.id))
      : new Set(
          (
            await database
              .selectFrom("role_resources")
              .innerJoin("user_roles", "user_roles.roleId", "role_resources.roleId")
              .select("role_resources.resourceId")
              .where("user_roles.userId", "=", key.userId)
              .execute()
          ).map((grant) => grant.resourceId),
        );
    const tools = resources.filter((resource) => resource.type === "tool" && allowed.has(resource.id));
    const services = resources.filter(
      (resource) =>
        resource.type === "service" &&
        (allowed.has(resource.id) || tools.some((tool) => tool.parentId === resource.id)),
    );
    const skills = resources.filter(
      (resource) =>
        resource.type === "skill" &&
        (resource.visibility === "public" || allowed.has(resource.id) || Boolean(key.isAdmin)),
    );
    response.json({ services, tools, skills });
  });
}
