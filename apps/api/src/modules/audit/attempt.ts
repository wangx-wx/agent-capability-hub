import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Implementation } from "@modelcontextprotocol/server";
import type { DatabaseSchema } from "../../database/schema.js";
import type { CallerContext } from "../services/credentials.js";
import { toolQuery } from "../tools/catalog.js";
import { serviceQuery } from "../services/routes.js";

export interface AuditAttempt { id: string; startedAtMs: number; finished: boolean }

export async function beginAudit(database: Kysely<DatabaseSchema>, actor: CallerContext, name: string, clientInfo?: Implementation): Promise<AuditAttempt> {
  const tool = (await toolQuery(database).execute()).find((row) => `${row.namespace}__${row.originalName}` === name);
  const service = tool ? await serviceQuery(database).where("services.id", "=", tool.serviceId).executeTakeFirst() : undefined;
  const user = await database.selectFrom("users").where("id", "=", actor.userId).select("username").executeTakeFirstOrThrow();
  const id = randomUUID();
  const startedAtMs = performance.now();
  await database.insertInto("audit").values({
    id, userId: actor.userId, username: user.username, keyId: actor.keyId ?? null,
    serviceId: service?.id ?? null, serviceName: service?.name ?? null, toolId: tool?.id ?? null, toolName: name,
    createdAt: new Date().toISOString(), status: "running", durationMs: null,
    clientName: clientInfo?.name ?? null, clientVersion: clientInfo?.version ?? null,
  }).execute();
  return { id, startedAtMs, finished: false };
}

export async function finishAudit(database: Kysely<DatabaseSchema>, attempt: AuditAttempt, failed: boolean) {
  attempt.finished = true;
  const durationMs = Math.max(0, Math.round(performance.now() - attempt.startedAtMs));
  try {
    await database.updateTable("audit").set({ status: failed ? "failed" : "succeeded", durationMs }).where("id", "=", attempt.id).execute();
  } catch { process.stderr.write("MCP audit update failed; actual tool result returned\n"); }
}
