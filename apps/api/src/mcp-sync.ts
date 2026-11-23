import { randomUUID } from "node:crypto";
import type { Router } from "express";
import type { Kysely } from "kysely";
import type { Tool } from "@modelcontextprotocol/server";
import type { DatabaseSchema } from "./database.js";
import type { McpSources } from "./mcp-sources.js";
import { serviceQuery } from "./services.js";
import { presentTool, toolQuery } from "./tool-catalog.js";
import { assertSchemaBudget } from "./limits.js";
import { assertHeaderDeclarations } from "./mcp-tool-schema.js";

export function registerSyncRoutes(router: Router, database: Kysely<DatabaseSchema>, sources: McpSources) {
  const previews = new Map<string, { serviceId: string; fingerprint: string; tools: Tool[] }>();
  const fingerprint = async (serviceId: string) => JSON.stringify([
    await serviceQuery(database).where("services.id", "=", serviceId).executeTakeFirst(),
    await toolQuery(database).where("tools.serviceId", "=", serviceId).orderBy("tools.originalName").execute(),
  ]);

  router.get("/:id/tools", async (request, response) => {
    response.json({ tools: (await toolQuery(database).where("tools.serviceId", "=", request.params.id).orderBy("tools.originalName").execute()).map(presentTool) });
  });
  router.post("/:id/sync-preview", async (request, response) => {
    const service = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
    if (!service) { response.status(404).json({ error: "Service not found" }); return; }
    const originalFingerprint = await fingerprint(service.id);
    let tools: Tool[];
    try {
      tools = await sources.discover(service);
      const names = new Set<string>();
      for (const tool of tools) {
        assertSchemaBudget(tool.inputSchema, sources.limits);
        assertHeaderDeclarations(tool.inputSchema);
        if (tool.outputSchema) assertSchemaBudget(tool.outputSchema, sources.limits);
        if (!/^[A-Za-z0-9_.-]+$/.test(tool.name) || `${service.namespace}__${tool.name}`.length > 128 || names.has(tool.name)) {
          throw new Error("Discovered duplicate or invalid tool name");
        }
        names.add(tool.name);
      }
    } catch (error) { response.status(502).json({ error: error instanceof Error ? error.message : "Discovery failed" }); return; }
    if (originalFingerprint !== await fingerprint(service.id)) { response.status(409).json({ error: "Service changed during discovery; synchronize again" }); return; }
    const existing = await toolQuery(database).where("tools.serviceId", "=", service.id).execute();
    const byName = new Map(existing.map((tool) => [tool.originalName, tool]));
    const named = (tool: Tool) => ({ ...tool, originalName: tool.name, name: `${service.namespace}__${tool.name}` });
    const id = randomUUID();
    previews.set(id, { serviceId: service.id, fingerprint: originalFingerprint, tools });
    response.json({ preview: { id, serviceId: service.id,
      added: tools.filter((tool) => !byName.has(tool.name)).map(named),
      modified: tools.filter((tool) => byName.has(tool.name) && byName.get(tool.name)!.definition !== JSON.stringify(tool)).map((tool) => ({ ...named(tool), id: byName.get(tool.name)!.id })),
      deleted: existing.filter((tool) => !tools.some((current) => current.name === tool.originalName)).map(presentTool),
    } });
  });
  router.post("/:id/sync-confirm", async (request, response) => {
    const preview = previews.get(request.body?.previewId);
    if (!preview || preview.serviceId !== request.params.id || preview.fingerprint !== await fingerprint(request.params.id)) {
      response.status(409).json({ error: "Preview is stale; synchronize again" }); return;
    }
    await database.transaction().execute(async (transaction) => {
      const service = await serviceQuery(transaction).where("services.id", "=", preview.serviceId).executeTakeFirstOrThrow();
      const existing = await transaction.selectFrom("tools").where("serviceId", "=", service.id).selectAll().execute();
      for (const tool of preview.tools) {
        const old = existing.find((row) => row.originalName === tool.name);
        const id = old?.id ?? randomUUID();
        const resource = { name: `${service.namespace}__${tool.name}`, description: tool.description ?? "" };
        if (old) {
          await transaction.updateTable("resources").set(resource).where("id", "=", id).execute();
          await transaction.updateTable("tools").set({ definition: JSON.stringify(tool) }).where("id", "=", id).execute();
        } else {
          await transaction.insertInto("resources").values({ id, type: "tool", visibility: "restricted", parentId: service.id, ...resource }).execute();
          await transaction.insertInto("tools").values({ id, serviceId: service.id, originalName: tool.name, definition: JSON.stringify(tool) }).execute();
        }
      }
      for (const tool of existing.filter((row) => !preview.tools.some((current) => current.name === row.originalName))) {
        await transaction.deleteFrom("resources").where("id", "=", tool.id).execute();
      }
    });
    previews.delete(request.body.previewId);
    response.json({ tools: (await toolQuery(database).where("tools.serviceId", "=", preview.serviceId).orderBy("tools.originalName").execute()).map(presentTool) });
  });
}
