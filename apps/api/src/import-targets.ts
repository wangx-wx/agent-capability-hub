import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { ImportPreview } from "./import-types.js";
import { defineRestTool, type RestTool } from "./rest-definition.js";
import type { GatewayLimits } from "./limits.js";
import { serviceQuery } from "./services.js";

export async function importServiceRevision(database: Kysely<DatabaseSchema>, serviceId: string) {
  return createHash("sha256").update(JSON.stringify([
    await serviceQuery(database).where("services.id", "=", serviceId).executeTakeFirst(),
    await database.selectFrom("tools").where("serviceId", "=", serviceId).selectAll().orderBy("id").execute(),
  ])).digest("hex");
}

export function operationIdentity(tool: RestTool) { return `${tool.rest.method}\0${tool.rest.path}`; }

export async function targetImport(database: Kysely<DatabaseSchema>, preview: ImportPreview, targets: unknown, limits: GatewayLimits) {
  if (targets !== undefined && (!targets || typeof targets !== "object" || Array.isArray(targets))) throw new Error("Target services must be a URL-to-service map");
  const choices = (targets ?? {}) as Record<string, unknown>;
  for (const group of preview.groups) {
    const serviceId = choices[group.url];
    if (serviceId === undefined || serviceId === null || serviceId === "") {
      for (const operation of group.operations) if (operation.supported) operation.change = "added";
      continue;
    }
    if (typeof serviceId !== "string") throw new Error("Target service ID must be a string");
    const service = await serviceQuery(database).where("services.id", "=", serviceId).executeTakeFirst();
    if (!service || service.kind !== "rest") throw new Error("Select an existing REST service");
    if (new URL(service.url).toString() !== new URL(group.url).toString()) throw new Error("Existing REST service must match the target URL; edit its configuration before retargeting");
    group.serviceId = serviceId;
    group.revision = await importServiceRevision(database, serviceId);
    group.name = service.name;
    group.namespace = service.namespace;
    group.headers = JSON.parse(service.headers);
    const existing = await database.selectFrom("tools").where("serviceId", "=", serviceId).selectAll().execute();
    const byIdentity = new Map(existing.map((row) => [operationIdentity(JSON.parse(row.definition) as RestTool), row]));
    for (const operation of group.operations) {
      if (!operation.supported) continue;
      const tool = defineRestTool(operation.definition, limits);
      const old = byIdentity.get(operationIdentity(tool));
      operation.existingToolId = old?.id;
      operation.change = !old ? "added" : old.definition === JSON.stringify(tool) ? "unchanged" : "modified";
    }
  }
}
