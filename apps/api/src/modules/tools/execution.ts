import type { Kysely } from "kysely";
import type { CallToolResult, JsonSchemaType, Tool } from "@modelcontextprotocol/server";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import type { DatabaseSchema } from "../../database/schema.js";
import type { CallerContext } from "../services/credentials.js";
import type { McpSources } from "../mcp/sources.js";
import { listVisibleTools, toolQuery } from "./catalog.js";
import { serviceQuery } from "../services/routes.js";
import { finishAudit, type AuditAttempt } from "../audit/attempt.js";
import { executeRest } from "../rest/execution.js";
import type { RestTool } from "../rest/definition.js";
import { assertSchemaBudget } from "../../config/limits.js";

const validator = new AjvJsonSchemaValidator();

export function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export async function executeTool(database: Kysely<DatabaseSchema>, sources: McpSources,
  toolId: string, args: Record<string, unknown>, caller: CallerContext, signal?: AbortSignal): Promise<CallToolResult> {
  const row = await database.selectFrom("tools").selectAll().where("id", "=", toolId).executeTakeFirstOrThrow();
  const service = await serviceQuery(database).where("services.id", "=", row.serviceId).executeTakeFirstOrThrow();
  const definition = JSON.parse(row.definition) as Tool;
  assertSchemaBudget(definition.inputSchema, sources.limits);
  const valid = validator.getValidator(definition.inputSchema as JsonSchemaType)(args);
  if (!valid.valid) return toolError(`Invalid tool arguments: ${valid.errorMessage}`);
  try {
    if (service.kind === "rest") return await executeRest(service, definition as RestTool, args, caller, sources.limits, signal);
    return await sources.withClient(service, (client) => client.callTool({ name: row.originalName, arguments: args }, {
      timeout: service.timeoutSeconds * 1000, signal, toolDefinition: definition,
    }), caller);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : "Downstream tool call failed");
  }
}

export async function executeFormalTool(database: Kysely<DatabaseSchema>, sources: McpSources,
  actor: CallerContext, name: string, args: Record<string, unknown>, attempt: AuditAttempt | undefined, signal?: AbortSignal): Promise<CallToolResult> {
  if (!attempt) return toolError("Audit unavailable; tool call was not sent");
  const tool = (await toolQuery(database).execute()).find((row) => `${row.namespace}__${row.originalName}` === name);

  let result: CallToolResult;
  try {
    const allowed = tool && (await listVisibleTools(database, sources, actor)).some((row) => row.id === tool.id);
    result = allowed ? await executeTool(database, sources, tool.id, args, actor, signal) : toolError("Tool unavailable or access denied");
  } catch { result = toolError("Tool call could not be completed"); }
  await finishAudit(database, attempt, Boolean(result.isError));
  return result;
}
