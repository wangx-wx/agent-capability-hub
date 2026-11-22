import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { GatewayLimits } from "./limits.js";
import type { ImportPreview } from "./import-types.js";
import { parseService, presentService } from "./services.js";
import { defineRestTool } from "./rest-definition.js";

export async function confirmImport(database: Kysely<DatabaseSchema>, preview: ImportPreview, groups: unknown, limits: GatewayLimits) {
  if (!Array.isArray(groups)) throw new Error("Selected groups are required");
  const selected = groups.map((input: Record<string, unknown>) => {
    const group = preview.groups.find((group) => group.id === input.groupId);
    if (!group || !Array.isArray(input.operations) || !input.operations.length) throw new Error("Select supported operations from the preview");
    const service = parseService({ name: input.name ?? group.name, namespace: input.namespace ?? group.namespace,
      url: group.url, kind: "rest", headers: input.headers ?? group.headers, enabled: input.enabled ?? false, timeoutSeconds: input.timeoutSeconds ?? 60 });
    const tools = input.operations.map((choice: { operationId?: string; definition?: Record<string, unknown> }) => {
      const operation = group.operations.find((operation) => operation.id === choice.operationId);
      if (!operation?.supported) throw new Error("Unsupported operations cannot be selected");
      const tool = defineRestTool(choice.definition ?? operation.definition, limits);
      if (`${service.namespace}__${tool.name}`.length > 128) throw new Error("Public tool name exceeds 128 characters");
      return tool;
    });
    if (new Set(tools.map((tool) => tool.name)).size !== tools.length) throw new Error("Duplicate selected tool names");
    return { service, tools };
  });
  if (!selected.length) throw new Error("Select at least one operation");
  return database.transaction().execute(async (transaction) => {
    const result = [];
    for (const { service, tools } of selected) {
      const { name, description, ...row } = service;
      await transaction.insertInto("resources").values({ id: service.id, type: "service", visibility: "restricted", parentId: null, name, description }).execute();
      await transaction.insertInto("services").values(row).execute();
      const saved = [];
      for (const tool of tools) {
        const id = randomUUID();
        await transaction.insertInto("resources").values({ id, type: "tool", visibility: "restricted", parentId: service.id, name: `${service.namespace}__${tool.name}`, description: tool.description ?? "" }).execute();
        await transaction.insertInto("tools").values({ id, serviceId: service.id, originalName: tool.name, definition: JSON.stringify(tool) }).execute();
        saved.push({ ...tool, id, serviceId: service.id, originalName: tool.name, name: `${service.namespace}__${tool.name}` });
      }
      result.push({ service: presentService(service), tools: saved });
    }
    return { groups: result };
  });
}
