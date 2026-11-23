import type { Router } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { McpSources } from "./mcp-sources.js";
import { executeTool } from "./tool-execution.js";

export function registerToolTestRoutes(router: Router, database: Kysely<DatabaseSchema>, sources: McpSources) {
  router.post("/:id/tools/:toolId/test", async (request, response) => {
    const tool = await database.selectFrom("tools").select("id").where("serviceId", "=", request.params.id).where("id", "=", request.params.toolId).executeTakeFirst();
    if (!tool) { response.status(404).json({ error: "Tool not found" }); return; }
    const args = request.body?.arguments ?? {};
    if (!args || typeof args !== "object" || Array.isArray(args)) { response.status(400).json({ error: "Arguments must be an object" }); return; }
    response.json({ result: await executeTool(database, sources, tool.id, args, { userId: response.locals.actorId, isAdmin: true }) });
  });
}
