import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Implementation } from "@modelcontextprotocol/server";
import type { DatabaseSchema } from "./database.js";
import type { CallerContext } from "./credentials.js";
import { toolQuery } from "./tool-catalog.js";
import { serviceQuery } from "./services.js";

export interface AuditAttempt { id: string; finished: boolean }

export async function beginAudit(database: Kysely<DatabaseSchema>, actor: CallerContext, name: string, clientInfo?: Implementation): Promise<AuditAttempt> {
  const tool = (await toolQuery(database).execute()).find((row) => `${row.namespace}__${row.originalName}` === name);
  const service = tool ? await serviceQuery(database).where("services.id", "=", tool.serviceId).executeTakeFirst() : undefined;
  const user = await database.selectFrom("users").where("id", "=", actor.userId).select("username").executeTakeFirstOrThrow();
  const id = randomUUID();
  await database.insertInto("audit").values({
    id, userId: actor.userId, username: user.username, keyId: actor.keyId ?? null,
    serviceId: service?.id ?? null, serviceName: service?.name ?? null, toolId: tool?.id ?? null, toolName: name,
    createdAt: new Date().toISOString(), status: "running", clientName: clientInfo?.name ?? null, clientVersion: clientInfo?.version ?? null,
  }).execute();
  return { id, finished: false };
}

export async function finishAudit(database: Kysely<DatabaseSchema>, attempt: AuditAttempt, failed: boolean) {
  attempt.finished = true;
  try {
    await database.updateTable("audit").set({ status: failed ? "failed" : "succeeded" }).where("id", "=", attempt.id).execute();
  } catch { process.stderr.write("MCP audit update failed; actual tool result returned\n"); }
}
