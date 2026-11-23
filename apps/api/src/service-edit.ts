import type { RequestHandler, Router } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { McpSources } from "./mcp-sources.js";
import { parseService, presentService, serviceQuery } from "./services.js";
import { toolQuery } from "./tool-catalog.js";

export function registerServiceEditRoutes(router: Router, database: Kysely<DatabaseSchema>, sources: McpSources, forgetSync: (serviceId: string) => void) {
  for (const route of ["config-preview", "save"] as const) {
    const handle: RequestHandler = async (request, response) => {
      const old = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
      if (!old) { response.status(404).json({ error: "Service not found" }); return; }
      let service: ReturnType<typeof parseService>;
      try { service = { ...parseService({ ...presentService(old), ...request.body }), id: old.id }; }
      catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Invalid service" }); return; }
      if (await database.selectFrom("services").select("id").where("namespace", "=", service.namespace).where("id", "!=", service.id).executeTakeFirst()) {
        response.status(409).json({ error: "Namespace already exists" }); return;
      }
      const tools = await toolQuery(database).where("tools.serviceId", "=", old.id).execute();
      const renamedTools = old.namespace === service.namespace ? [] : tools.map((tool) => ({
        id: tool.id, oldName: `${old.namespace}__${tool.originalName}`, newName: `${service.namespace}__${tool.originalName}`,
      }));
      if (renamedTools.some((tool) => tool.newName.length > 128)) { response.status(400).json({ error: "A renamed tool exceeds 128 characters" }); return; }
      if (route === "config-preview") { response.json({ service: presentService(service), renamedTools }); return; }
      const { name, description, ...row } = service;
      await database.transaction().execute(async (transaction) => {
        await transaction.updateTable("resources").set({ name, description }).where("id", "=", service.id).execute();
        await transaction.updateTable("services").set(row).where("id", "=", service.id).execute();
        for (const tool of renamedTools) await transaction.updateTable("resources").set({ name: tool.newName }).where("id", "=", tool.id).execute();
      });
      forgetSync(service.id);
      if (!service.enabled || old.url !== service.url || old.headers !== service.headers || old.transport !== service.transport || old.timeoutSeconds !== service.timeoutSeconds) await sources.drop(service.id);
      sources.watch(service);
      response.json({ service: presentService(service, sources.status(service)) });
    };
    if (route === "config-preview") router.post("/:id/config-preview", handle);
    else router.patch("/:id", handle);
  }
  router.delete("/:id", async (request, response) => {
    const service = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
    if (!service) { response.status(404).json({ error: "Service not found" }); return; }
    await database.transaction().execute(async (transaction) => {
      await transaction.deleteFrom("resources").where("parentId", "=", service.id).execute();
      await transaction.deleteFrom("resources").where("id", "=", service.id).execute();
    });
    forgetSync(service.id);
    await sources.drop(service.id);
    response.status(204).end();
  });
}
