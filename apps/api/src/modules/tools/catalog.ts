import type { Kysely } from "kysely";
import type { Tool } from "@modelcontextprotocol/server";
import type { DatabaseSchema } from "../../database/schema.js";
import type { CallerContext } from "../services/credentials.js";
import type { McpSources } from "../mcp/sources.js";

export function toolQuery(database: Kysely<DatabaseSchema>) {
  return database.selectFrom("tools").innerJoin("services", "services.id", "tools.serviceId")
    .selectAll("tools").select(["services.namespace"]);
}

export function presentTool(row: { id: string; serviceId: string; namespace: string; originalName: string; definition: string }) {
  return { id: row.id, serviceId: row.serviceId, originalName: row.originalName,
    ...JSON.parse(row.definition) as Tool, name: `${row.namespace}__${row.originalName}` };
}

export async function visibleResourceIds(database: Kysely<DatabaseSchema>, actor: CallerContext) {
  if (actor.isAdmin) return null;
  return new Set((await database.selectFrom("role_resources")
    .innerJoin("user_roles", "user_roles.roleId", "role_resources.roleId")
    .where("user_roles.userId", "=", actor.userId).select("resourceId").execute()).map((grant) => grant.resourceId));
}

export async function canViewService(database: Kysely<DatabaseSchema>, serviceId: string, actor: CallerContext) {
  const grants = await visibleResourceIds(database, actor);
  if (!grants) return true;
  if (grants.has(serviceId)) return true;
  const tools = await database.selectFrom("tools").select("id").where("serviceId", "=", serviceId).execute();
  return tools.some((tool) => grants.has(tool.id));
}

export async function listVisibleTools(database: Kysely<DatabaseSchema>, sources: McpSources, actor: CallerContext, serviceId?: string) {
  const services = await database.selectFrom("services").where("enabled", "=", 1).selectAll().execute();
  const available = new Set(services.filter((service) => service.kind === "rest" || sources.status(service) === "connected").map((service) => service.id));
  const grants = await visibleResourceIds(database, actor);
  return (await toolQuery(database).orderBy("tools.originalName").execute())
    .filter((tool) => available.has(tool.serviceId) && (!serviceId || tool.serviceId === serviceId) && (!grants || grants.has(tool.id)));
}
