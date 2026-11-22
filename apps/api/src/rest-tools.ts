import { randomUUID } from "node:crypto";
import type { Router } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import { serviceQuery } from "./services.js";
import { defineRestTool } from "./rest-definition.js";
import type { GatewayLimits } from "./limits.js";

export function registerRestToolRoutes(router: Router, database: Kysely<DatabaseSchema>, limits: GatewayLimits) {
  router.post("/:id/tools", async (request, response) => {
    const service = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
    if (!service) { response.status(404).json({ error: "Service not found" }); return; }
    if (service.kind !== "rest") { response.status(400).json({ error: "Manual operations require a REST service" }); return; }
    let tool: ReturnType<typeof defineRestTool>;
    try {
      tool = defineRestTool(request.body ?? {}, limits);
      if (`${service.namespace}__${tool.name}`.length > 128) throw new Error("Public tool name exceeds 128 characters");
    } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Invalid REST operation" }); return; }
    if (await database.selectFrom("tools").select("id").where("serviceId", "=", service.id).where("originalName", "=", tool.name).executeTakeFirst()) {
      response.status(409).json({ error: "Tool name already exists" }); return;
    }
    const id = randomUUID();
    await database.transaction().execute(async (transaction) => {
      await transaction.insertInto("resources").values({ id, parentId: service.id, type: "tool", visibility: "restricted", name: `${service.namespace}__${tool.name}`, description: tool.description ?? "" }).execute();
      await transaction.insertInto("tools").values({ id, serviceId: service.id, originalName: tool.name, definition: JSON.stringify(tool) }).execute();
    });
    response.status(201).json({ tool: { ...tool, id, serviceId: service.id, originalName: tool.name, name: `${service.namespace}__${tool.name}` } });
  });
}
