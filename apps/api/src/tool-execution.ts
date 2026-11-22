import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { CallToolResult, Implementation, JsonSchemaType, Tool } from "@modelcontextprotocol/server";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import type { DatabaseSchema } from "./database.js";
import type { CallerContext } from "./credentials.js";
import type { McpSources } from "./mcp-sources.js";
import { listVisibleTools, toolQuery } from "./tool-catalog.js";
import { serviceQuery } from "./services.js";

const validator = new AjvJsonSchemaValidator();

export function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export async function executeTool(database: Kysely<DatabaseSchema>, sources: McpSources,
  toolId: string, args: Record<string, unknown>, caller: CallerContext, signal?: AbortSignal): Promise<CallToolResult> {
  const row = await database.selectFrom("tools").selectAll().where("id", "=", toolId).executeTakeFirstOrThrow();
  const service = await serviceQuery(database).where("services.id", "=", row.serviceId).executeTakeFirstOrThrow();
  const definition = JSON.parse(row.definition) as Tool;
  const valid = validator.getValidator(definition.inputSchema as JsonSchemaType)(args);
  if (!valid.valid) return toolError(`Invalid tool arguments: ${valid.errorMessage}`);
  try {
    const client = await sources.connect(service);
    return await client.callTool({ name: row.originalName, arguments: args }, {
      timeout: service.timeoutSeconds * 1000, signal, toolDefinition: definition,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : "Downstream tool call failed");
  }
}

export async function executeFormalTool(database: Kysely<DatabaseSchema>, sources: McpSources,
  actor: CallerContext, name: string, args: Record<string, unknown>, signal?: AbortSignal, clientInfo?: Implementation): Promise<CallToolResult> {
  const tool = (await toolQuery(database).execute()).find((row) => `${row.namespace}__${row.originalName}` === name);
  const service = tool ? await serviceQuery(database).where("services.id", "=", tool.serviceId).executeTakeFirst() : undefined;
  const user = await database.selectFrom("users").where("id", "=", actor.userId).select("username").executeTakeFirstOrThrow();
  const id = randomUUID();
  try {
    await database.insertInto("audit").values({
      id, userId: actor.userId, username: user.username, keyId: actor.keyId ?? null,
      serviceId: service?.id ?? null, serviceName: service?.name ?? null, toolId: tool?.id ?? null, toolName: name,
      createdAt: new Date().toISOString(), status: "running", clientName: clientInfo?.name ?? null, clientVersion: clientInfo?.version ?? null,
    }).execute();
  } catch { return toolError("Audit unavailable; tool call was not sent"); }

  let result: CallToolResult;
  try {
    const allowed = tool && (await listVisibleTools(database, sources, actor)).some((row) => row.id === tool.id);
    result = allowed ? await executeTool(database, sources, tool.id, args, actor, signal) : toolError("Tool unavailable or access denied");
  } catch { result = toolError("Tool call could not be completed"); }
  try {
    await database.updateTable("audit").set({ status: result.isError ? "failed" : "succeeded" }).where("id", "=", id).execute();
  } catch { process.stderr.write("MCP audit update failed; actual tool result returned\n"); }
  return result;
}
