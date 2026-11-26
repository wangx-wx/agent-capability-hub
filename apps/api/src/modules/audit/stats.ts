import { sql, type Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import { filteredAuditQuery, type AuditFilters } from "./query.js";

const HOUR = 3_600_000;
const BEIJING_OFFSET = 8 * HOUR;

export async function auditStats(database: Kysely<DatabaseSchema>, filters: AuditFilters, userId?: string) {
  const query = filteredAuditQuery(database, filters, userId);
  const counts = () => [
    sql<number>`COUNT(*)`.as("total"),
    sql<number>`COALESCE(SUM(status = 'succeeded'), 0)`.as("succeeded"),
    sql<number>`COALESCE(SUM(status = 'failed'), 0)`.as("failed"),
  ];
  const row = await query.select([
    ...counts(),
    sql<number>`COALESCE(SUM(status = 'running'), 0)`.as("running"),
    sql<number>`COALESCE(SUM(status = 'unknown'), 0)`.as("unknown"),
    sql<number | null>`AVG(CASE WHEN status IN ('succeeded', 'failed') THEN durationMs END)`.as("averageDurationMs"),
    sql<string | null>`MIN(createdAt)`.as("first"),
    sql<string | null>`MAX(createdAt)`.as("last"),
  ]).executeTakeFirstOrThrow();
  const summary = { total: row.total, succeeded: row.succeeded, failed: row.failed, running: row.running, unknown: row.unknown,
    successRate: row.succeeded + row.failed ? row.succeeded / (row.succeeded + row.failed) : null,
    averageDurationMs: row.averageDurationMs };
  const start = filters.from ? Date.parse(filters.from) : row.first ? Date.parse(row.first) : undefined;
  const end = filters.to ? Date.parse(filters.to) : row.last ? Date.parse(row.last) + 1 : undefined;
  const span = start !== undefined && end !== undefined ? end - start : 0;
  const interval = span <= 48 * HOUR ? "hour" : span <= 90 * 24 * HOUR ? "day" : "month";
  const trend: Array<{ time: string; total: number; succeeded: number; failed: number }> = [];
  if (start === undefined || end === undefined || start >= end) return { summary, interval, trend };

  const format = interval === "hour" ? "%Y-%m-%dT%H:00:00+08:00" : interval === "day" ? "%Y-%m-%dT00:00:00+08:00" : "%Y-%m-01T00:00:00+08:00";
  const bucket = sql<string>`strftime(${format}, createdAt, '+8 hours')`;
  const rows = await query.select([bucket.as("time"), ...counts()]).groupBy(bucket).orderBy("time").execute();
  const byTime = new Map(rows.map((entry) => [entry.time, entry]));
  const cursor = new Date(start + BEIJING_OFFSET);
  cursor.setUTCMinutes(0, 0, 0);
  if (interval !== "hour") cursor.setUTCHours(0);
  if (interval === "month") cursor.setUTCDate(1);
  while (cursor.getTime() < end + BEIJING_OFFSET) {
    const time = `${cursor.toISOString().slice(0, 19)}+08:00`;
    trend.push(byTime.get(time) ?? { time, total: 0, succeeded: 0, failed: 0 });
    if (interval === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else if (interval === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return { summary, interval, trend };
}
