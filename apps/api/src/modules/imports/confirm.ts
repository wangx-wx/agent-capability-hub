import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import type { GatewayLimits } from "../../config/limits.js";
import type { ImportPreview } from "./types.js";
import { parseService, presentService } from "../services/routes.js";
import { defineRestTool } from "../rest/definition.js";
import { serviceQuery } from "../services/routes.js";
import { importServiceRevision, operationIdentity } from "./targets.js";
import type { RestTool } from "../rest/definition.js";

export async function confirmImport(database: Kysely<DatabaseSchema>, preview: ImportPreview, groups: unknown, limits: GatewayLimits) {
  if (!Array.isArray(groups)) throw new Error("Selected groups are required");
  const selected = await Promise.all(groups.map(async (input: Record<string, unknown>) => {
    const group = preview.groups.find((group) => group.id === input.groupId);
    if (!group || !Array.isArray(input.operations) || !input.operations.length) throw new Error("Select supported operations from the preview");
    if (input.serviceId !== undefined && input.serviceId !== group.serviceId) throw new Error("Choose the existing target during preview before confirming");
    const old = group.serviceId ? await serviceQuery(database).where("services.id", "=", group.serviceId).executeTakeFirst() : undefined;
    if (group.serviceId && !old) throw new Error("Target service was deleted; preview again");
    const service = parseService({ name: input.name ?? group.name, namespace: input.namespace ?? group.namespace,
      url: group.url, kind: "rest", headers: input.headers ?? group.headers, enabled: input.enabled ?? Boolean(old?.enabled), timeoutSeconds: input.timeoutSeconds ?? old?.timeoutSeconds ?? 60 });
    if (old) service.id = old.id;
    const tools = input.operations.map((choice: { operationId?: string; definition?: Record<string, unknown> }) => {
      const operation = group.operations.find((operation) => operation.id === choice.operationId);
      if (!operation?.supported) throw new Error("Unsupported operations cannot be selected");
      const tool = defineRestTool(choice.definition ?? operation.definition, limits);
      if (`${service.namespace}__${tool.name}`.length > 128) throw new Error("Public tool name exceeds 128 characters");
      return tool;
    });
    if (new Set(tools.map((tool) => tool.name)).size !== tools.length) throw new Error("Duplicate selected tool names");
    if (new Set(tools.map(operationIdentity)).size !== tools.length) throw new Error("Duplicate HTTP method/path operations");
    return { service, tools, group };
  }));
  if (!selected.length) throw new Error("Select at least one operation");
  return database.transaction().execute(async (transaction) => {
    const result = [];
    for (const { service, tools, group } of selected) {
      const { name, description, ...row } = service;
      if (group.serviceId) {
        if (group.revision !== await importServiceRevision(transaction, group.serviceId)) throw new Error("Target service changed; preview again");
        await transaction.updateTable("resources").set({ name, description }).where("id", "=", service.id).execute();
        await transaction.updateTable("services").set(row).where("id", "=", service.id).execute();
      } else {
        await transaction.insertInto("resources").values({ id: service.id, type: "service", visibility: "restricted", parentId: null, name, description }).execute();
        await transaction.insertInto("services").values(row).execute();
      }
      const existing = await transaction.selectFrom("tools").where("serviceId", "=", service.id).selectAll().execute();
      const byIdentity = new Map(existing.map((tool) => [operationIdentity(JSON.parse(tool.definition) as RestTool), tool]));
      const saved = [];
      for (const tool of tools) {
        const old = byIdentity.get(operationIdentity(tool));
        const id = old?.id ?? randomUUID();
        const resource = { name: `${service.namespace}__${tool.name}`, description: tool.description ?? "" };
        if (old) {
          await transaction.updateTable("resources").set(resource).where("id", "=", id).execute();
          await transaction.updateTable("tools").set({ originalName: tool.name, definition: JSON.stringify(tool) }).where("id", "=", id).execute();
        } else {
          await transaction.insertInto("resources").values({ id, type: "tool", visibility: "restricted", parentId: service.id, ...resource }).execute();
          await transaction.insertInto("tools").values({ id, serviceId: service.id, originalName: tool.name, definition: JSON.stringify(tool) }).execute();
        }
        saved.push({ ...tool, id, serviceId: service.id, originalName: tool.name, name: `${service.namespace}__${tool.name}` });
      }
      for (const tool of await transaction.selectFrom("tools").where("serviceId", "=", service.id).selectAll().execute()) {
        await transaction.updateTable("resources").set({ name: `${service.namespace}__${tool.originalName}` }).where("id", "=", tool.id).execute();
      }
      result.push({ service: presentService(service), tools: saved });
    }
    return { groups: result };
  });
}
