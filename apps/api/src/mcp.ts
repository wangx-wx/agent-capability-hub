import { createMcpHandler, Server } from "@modelcontextprotocol/server";
import { originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import type { Express } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import { resolveApiKey } from "./key-auth.js";

export interface McpOptions {
  allowedOrigins?: string[];
}

export function registerMcpRoutes(app: Express, database: Kysely<DatabaseSchema>, options: McpOptions = {}) {
  const validateOrigin = originValidation(options.allowedOrigins ?? (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean));
  const handler = createMcpHandler(() => {
    const server = new Server(
      { name: "agent-capability-hub", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    server.setRequestHandler("tools/list", async () => ({ tools: [] }));
    server.setRequestHandler("tools/call", async () => ({
      content: [{ type: "text", text: "Unknown or unavailable tool" }], isError: true,
    }));
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
    Object.assign(request, {
      auth: { token: request.header("authorization")!.slice(7), clientId: actor.userId, scopes: [], extra: actor },
    });
    await nodeHandler(request, response, request.body);
  });

  return handler.close;
}
