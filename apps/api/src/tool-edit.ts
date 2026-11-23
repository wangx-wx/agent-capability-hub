import type { RequestHandler, Router } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { GatewayLimits } from "./limits.js";
import { serviceQuery } from "./services.js";
import { defineRestTool, type RestTool } from "./rest-definition.js";
import { restOperationExists } from "./rest-tools.js";

export function registerToolEditRoutes(router: Router, database: Kysely<DatabaseSchema>, limits: GatewayLimits) {
  for (const method of ["patch", "put"] as const) {
    const handle: RequestHandler = async (request, response) => {
      const service = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
      const row = await database.selectFrom("tools").where("id", "=", request.params.toolId).where("serviceId", "=", request.params.id).selectAll().executeTakeFirst();
      if (!service || !row) { response.status(404).json({ error: "Tool not found" }); return; }
      if (service.kind !== "rest") { response.status(400).json({ error: "Native tools are edited through synchronization" }); return; }
      const old = JSON.parse(row.definition) as RestTool;
      let tool: RestTool;
      try {
        tool = defineRestTool(method === "put" ? request.body : { ...old.rest, name: row.originalName, description: old.description, example: old.example, ...request.body }, limits);
        if (`${service.namespace}__${tool.name}`.length > 128) throw new Error("Public tool name exceeds 128 characters");
      } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Invalid operation" }); return; }
      if (await restOperationExists(database, service.id, tool, row.id)) { response.status(409).json({ error: "HTTP method/path operation already exists" }); return; }
      await database.transaction().execute(async (transaction) => {
        await transaction.updateTable("resources").set({ name: `${service.namespace}__${tool.name}`, description: tool.description ?? "" }).where("id", "=", row.id).execute();
        await transaction.updateTable("tools").set({ originalName: tool.name, definition: JSON.stringify(tool) }).where("id", "=", row.id).execute();
      });
      response.json({ tool: { ...tool, id: row.id, serviceId: service.id, originalName: tool.name, name: `${service.namespace}__${tool.name}` } });
    };
    router[method]("/:id/tools/:toolId", handle);
  }
  router.delete("/:id/tools/:toolId", async (request, response) => {
    const tool = await database.selectFrom("tools").where("id", "=", request.params.toolId).where("serviceId", "=", request.params.id).select("id").executeTakeFirst();
    if (!tool) { response.status(404).json({ error: "Tool not found" }); return; }
    await database.deleteFrom("resources").where("id", "=", tool.id).execute();
    response.status(204).end();
  });
}
