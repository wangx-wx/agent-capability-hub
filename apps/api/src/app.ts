import express from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database/schema.js";
import { registerApiKeyRoutes } from "./modules/api-keys/routes.js";
import { registerResourceRoutes } from "./modules/resources/routes.js";
import { registerMcpRoutes, type McpOptions } from "./modules/mcp/gateway.js";
import { registerServiceRoutes } from "./modules/services/routes.js";
import { McpSources } from "./modules/mcp/sources.js";
import { registerAuditRoutes } from "./modules/audit/routes.js";
import { gatewayLimits } from "./config/limits.js";
import { registerImportRoutes } from "./modules/imports/routes.js";
import { getSessionUser } from "./modules/auth/session.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerRoleRoutes } from "./modules/roles/routes.js";
import { registerUserRoutes } from "./modules/users/routes.js";

export function createApp(database: Kysely<DatabaseSchema>, options: McpOptions = {}) {
  const app = express();
  const limits = gatewayLimits(options.limits);
  app.use("/mcp", express.json({ limit: limits.requestBytes }));
  app.use(express.json({ limit: Math.max(limits.requestBytes, limits.importBytes * 6) + 65536 }));

  const resolveUser = (request: express.Request) => getSessionUser(database, request);
  registerAuthRoutes(app, database, resolveUser);
  registerRoleRoutes(app, database, resolveUser);
  registerUserRoutes(app, database, resolveUser);

  app.get("/api/health", async (_request, response) => {
    try {
      await database.selectNoFrom((expression) => expression.lit(1).as("value")).executeTakeFirst();
      response.json({ status: "ok", database: "ok" });
    } catch {
      response.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  registerResourceRoutes(app, database, resolveUser);
  registerApiKeyRoutes(app, database, resolveUser);
  registerAuditRoutes(app, database, resolveUser);
  registerImportRoutes(app, database, resolveUser, limits);
  const sources = new McpSources(limits);
  registerServiceRoutes(app, database, resolveUser, sources);
  const closeMcp = registerMcpRoutes(app, database, sources, options);
  app.locals.closeMcp = async () => { await closeMcp(); await sources.close(); };
  app.locals.startMcp = async () => {
    for (const service of await database.selectFrom("services").where("enabled", "=", 1).selectAll().execute()) sources.watch(service);
  };
  app.use((error: { status?: number; code?: string }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = error.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    response.status(status).json({ error: status === 409 ? "Public tool name or namespace already exists" : status === 413 ? "Request exceeds the configured byte limit" : status === 400 ? "Invalid request body" : "Request could not be completed" });
  });

  return app;
}
