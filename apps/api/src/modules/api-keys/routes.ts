import { randomBytes, randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";

interface SessionUser {
  id: string;
  isAdmin: boolean;
}

type ResolveSessionUser = (request: Request) => Promise<SessionUser | null>;

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function registerApiKeyRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {
  async function createKey(userId: string, body: Record<string, unknown>, response: Response) {
    const name = isString(body.name) ? body.name.trim() : "";
    if (!name || !Object.hasOwn(body, "expiresAt")) {
      response.status(400).json({ error: "Name and expiry choice are required" });
      return;
    }
    let expiresAt: string | null;
    if (body.expiresAt === null) {
      expiresAt = null;
    } else if (isString(body.expiresAt) && Number.isFinite(Date.parse(body.expiresAt))) {
      expiresAt = new Date(body.expiresAt).toISOString();
      if (expiresAt <= new Date().toISOString()) {
        response.status(400).json({ error: "Expiry must be in the future" });
        return;
      }
    } else {
      response.status(400).json({ error: "Expiry must be a future date or null for permanent" });
      return;
    }

    const key = {
      id: randomUUID(),
      userId,
      name,
      value: `ach_${randomBytes(32).toString("base64url")}`,
      expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    await database.insertInto("api_keys").values(key).execute();
    response.status(201).json({ key });
  }

  app.get("/api/keys", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    const keys = await database
      .selectFrom("api_keys")
      .select(["id", "name", "value", "expiresAt", "revokedAt", "createdAt"])
      .where("userId", "=", actor.id)
      .orderBy("createdAt", "desc")
      .execute();
    response.json({ keys });
  });

  app.post("/api/keys", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    await createKey(actor.id, request.body ?? {}, response);
  });

  app.get("/api/admin/users/:userId/keys", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    const keys = await database
      .selectFrom("api_keys")
      .select(["id", "name", "value", "expiresAt", "revokedAt", "createdAt"])
      .where("userId", "=", request.params.userId)
      .orderBy("createdAt", "desc")
      .execute();
    response.json({ keys });
  });

  app.post("/api/admin/users/:userId/keys", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.isAdmin) {
      response.status(403).json({ error: "Administrator access required" });
      return;
    }
    const user = await database.selectFrom("users").select(["id", "active"]).where("id", "=", request.params.userId).executeTakeFirst();
    if (!user) {
      response.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.active) {
      response.status(409).json({ error: "Cannot create a key for a disabled user" });
      return;
    }
    await createKey(user.id, request.body ?? {}, response);
  });

  app.delete("/api/keys/:keyId", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    const key = await database.selectFrom("api_keys").select(["id", "userId"]).where("id", "=", request.params.keyId).executeTakeFirst();
    if (!key) {
      response.status(404).json({ error: "API Key not found" });
      return;
    }
    if (!actor.isAdmin && actor.id !== key.userId) {
      response.status(404).json({ error: "API Key not found" });
      return;
    }
    await database
      .updateTable("api_keys")
      .set({ revokedAt: new Date().toISOString() })
      .where("id", "=", key.id)
      .where("revokedAt", "is", null)
      .execute();
    response.status(204).end();
  });
}
