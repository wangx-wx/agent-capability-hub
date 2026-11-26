import type { Request } from "express";
import { sql, type Kysely } from "kysely";
import type { AuditTable, DatabaseSchema } from "../../database/schema.js";

const TEXT_FIELDS = ["username", "serviceName", "toolName", "clientName"] as const;
const VALID_STATUSES = new Set<AuditTable["status"]>(["running", "succeeded", "failed", "unknown"]);
export interface AuditFilters {
  from?: string;
  to?: string;
  status?: AuditTable["status"];
  q: string;
  username: string;
  serviceName: string;
  toolName: string;
  clientName: string;
}

function textParam(query: Request["query"], name: string) {
  const value = query[name];
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("Invalid audit query parameter");
  return value.trim();
}

function dateParam(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(date.getTime())) {
    throw new Error("Invalid audit time range");
  }
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23) {
    throw new Error("Invalid audit time range");
  }
  return date.toISOString();
}

export function parseAuditFilters(query: Request["query"]): AuditFilters {
  const status = textParam(query, "status");
  if (status && !VALID_STATUSES.has(status as AuditTable["status"])) throw new Error("Invalid audit status");
  const from = dateParam(textParam(query, "from"));
  const to = dateParam(textParam(query, "to"));
  if (from && to && from >= to) throw new Error("Invalid audit time range");
  return { from, to, status: status ? status as AuditTable["status"] : undefined,
    q: textParam(query, "q"), username: textParam(query, "username"), serviceName: textParam(query, "serviceName"),
    toolName: textParam(query, "toolName"), clientName: textParam(query, "clientName") };
}

function pattern(value: string) {
  return `%${value.toLowerCase().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export function filteredAuditQuery(database: Kysely<DatabaseSchema>, filters: AuditFilters, userId?: string) {
  let query = database.selectFrom("audit");
  if (userId) query = query.where("userId", "=", userId);
  if (filters.status) query = query.where("status", "=", filters.status);
  if (filters.from) query = query.where("createdAt", ">=", filters.from);
  if (filters.to) query = query.where("createdAt", "<", filters.to);
  for (const field of TEXT_FIELDS) {
    if (filters[field]) query = query.where((eb) => sql<boolean>`LOWER(COALESCE(${eb.ref(field)}, '')) LIKE ${pattern(filters[field])} ESCAPE '\\'`);
  }
  if (filters.q) query = query.where((eb) => eb.or(TEXT_FIELDS.map((field) =>
    sql<boolean>`LOWER(COALESCE(${eb.ref(field)}, '')) LIKE ${pattern(filters.q)} ESCAPE '\\'`)));
  return query;
}
