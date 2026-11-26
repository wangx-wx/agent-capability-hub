import type { Express, Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import { filteredAuditQuery, parseAuditFilters } from "./query.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;

export function registerAuditRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser) {
  app.get("/api/admin/audit", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    const rawOffset = Number.parseInt(String(request.query.offset ?? "0"), 10);
    const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
    const rawLimit = Number.parseInt(String(request.query.limit ?? "100"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 100;

    let filters;
    try { filters = parseAuditFilters(request.query); }
    catch (reason) { response.status(400).json({ error: (reason as Error).message }); return; }
    const filtered = filteredAuditQuery(database, filters, actor.isAdmin ? undefined : actor.id);
    const [records, countRow] = await Promise.all([
      filtered.selectAll().orderBy("createdAt", "desc").orderBy("id").limit(limit).offset(offset).execute(),
      filtered.select((eb) => eb.fn.countAll<number>().as("total")).executeTakeFirstOrThrow(),
    ]);
    const total = Number(countRow.total);
    response.json({ records, total, hasMore: offset + records.length < total });
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
