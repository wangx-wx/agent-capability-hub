import { CLIENT_INFO_META_KEY, createMcpHandler, Server } from "@modelcontextprotocol/server";
import { originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import type { Express } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import { resolveApiKey } from "./key-auth.js";
import type { McpSources } from "./mcp-sources.js";
import { listVisibleTools, presentTool } from "./tool-catalog.js";
import type { CallerContext } from "./credentials.js";
import { executeFormalTool } from "./tool-execution.js";
import { beginAudit, finishAudit, type AuditAttempt } from "./audit-attempt.js";

export interface McpOptions {
  allowedOrigins?: string[];
}

export function registerMcpRoutes(app: Express, database: Kysely<DatabaseSchema>, sources: McpSources, options: McpOptions = {}) {
  const validateOrigin = originValidation(options.allowedOrigins ?? (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean));
  const handler = createMcpHandler(({ authInfo }) => {
    const caller = authInfo!.extra as unknown as CallerContext & { auditAttempt?: AuditAttempt };
    const server = new Server(
      { name: "agent-capability-hub", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    server.setRequestHandler("tools/list", async () => ({ tools: (await listVisibleTools(database, sources, authInfo!.extra as unknown as CallerContext))
      .map((row) => { const { id, serviceId, originalName, ...tool } = presentTool(row); return tool; }) }));
    server.setRequestHandler("tools/call", async (request, context) => executeFormalTool(database, sources,
      caller, request.params.name, request.params.arguments ?? {}, caller.auditAttempt, context.mcpReq.signal));
    return server;
  });
  const nodeHandler = toNodeHandler(handler);

  app.all("/mcp", async (request, response) => {
    if (!validateOrigin(request, response)) return;
    const actor = await resolveApiKey(database, request);
    if (!actor) {
      response.setHeader("WWW-Authenticate", "Bearer");
      response.status(401).json({ error: "Invalid or expired API Key" });
      return;
    }
    const caller = { ...actor, isAdmin: Boolean(actor.isAdmin) };
    let auditAttempt: AuditAttempt | undefined;
    if (request.body?.method === "tools/call") {
      const name = typeof request.body.params?.name === "string" ? request.body.params.name : "[invalid tool name]";
      const info = request.body.params?._meta?.[CLIENT_INFO_META_KEY];
      const clientInfo = info && typeof info.name === "string" && typeof info.version === "string" ? info : undefined;
      try { auditAttempt = await beginAudit(database, caller, name, clientInfo); } catch { /* Fail closed in the call handler. */ }
    }
    Object.assign(request, {
      auth: { token: request.header("authorization")!.slice(7), clientId: actor.userId, scopes: [], extra: { ...caller, auditAttempt } },
    });
    try { await nodeHandler(request, response, request.body); }
    finally { if (auditAttempt && !auditAttempt.finished) await finishAudit(database, auditAttempt, true); }
  });

  return handler.close;
}
