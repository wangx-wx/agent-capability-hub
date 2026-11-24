import type { Express, Request } from "express";
import { sql, type Kysely } from "kysely";
import type { AuditTable, DatabaseSchema } from "../../database/schema.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;
type AuditStatus = AuditTable["status"];

const VALID_STATUSES = new Set<AuditStatus>(["running", "succeeded", "failed", "unknown"]);

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function filteredAuditQuery(database: Kysely<DatabaseSchema>, status?: AuditStatus, q?: string) {
  let query = database.selectFrom("audit");
  if (status) {
    query = query.where("status", "=", status);
  }
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    query = query.where((eb) =>
      eb.or([
        sql<boolean>`LOWER(${eb.ref("username")}) LIKE ${pattern} ESCAPE '\\'`,
        sql<boolean>`LOWER(COALESCE(${eb.ref("serviceName")}, '')) LIKE ${pattern} ESCAPE '\\'`,
        sql<boolean>`LOWER(${eb.ref("toolName")}) LIKE ${pattern} ESCAPE '\\'`,
        sql<boolean>`LOWER(COALESCE(${eb.ref("clientName")}, '')) LIKE ${pattern} ESCAPE '\\'`,
      ]),
    );
  }
  return query;
}

export function registerAuditRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser) {
  app.get("/api/admin/audit", async (request, response) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    if (!actor.isAdmin) { response.status(403).json({ error: "Administrator access required" }); return; }

    const rawOffset = Number.parseInt(String(request.query.offset ?? "0"), 10);
    const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
    const rawLimit = Number.parseInt(String(request.query.limit ?? "100"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 100;

    const rawStatus = typeof request.query.status === "string" ? request.query.status.trim() : "";
    if (rawStatus && !VALID_STATUSES.has(rawStatus as AuditStatus)) {
      response.status(400).json({ error: "Invalid audit status" });
      return;
    }
    const status = rawStatus ? (rawStatus as AuditStatus) : undefined;
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";

    const filtered = filteredAuditQuery(database, status, q);
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
