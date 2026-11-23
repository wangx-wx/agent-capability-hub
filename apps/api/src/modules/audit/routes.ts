import type { Express, Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;

export function registerAuditRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser) {
  app.get("/api/admin/audit", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    if (!actor.isAdmin) { response.status(403).json({ error: "Administrator access required" }); return; }
    const offset = Math.max(0, Number.parseInt(String(request.query.offset ?? "0"), 10) || 0);
    const records = await database.selectFrom("audit").selectAll().orderBy("createdAt", "desc").orderBy("id")
      .limit(100).offset(offset).execute();
    response.json({ records });
  });
  app.get("/api/usage", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    const usage = await database.selectFrom("audit").where("userId", "=", actor.id).select((eb) => [
      eb.fn.countAll<number>().as("total"),
      eb.fn.sum<number>(eb.case().when("status", "=", "succeeded").then(1).else(0).end()).as("successful"),
      eb.fn.sum<number>(eb.case().when("status", "=", "failed").then(1).else(0).end()).as("failed"),
    ]).executeTakeFirstOrThrow();
    response.json({ total: Number(usage.total), successful: Number(usage.successful ?? 0), failed: Number(usage.failed ?? 0) });
  });
}
