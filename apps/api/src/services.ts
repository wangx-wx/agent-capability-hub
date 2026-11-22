import { randomUUID } from "node:crypto";
import { Router, type Express, type Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { ServiceTable } from "./service-schema.js";
import type { McpSources } from "./mcp-sources.js";
import { registerSyncRoutes } from "./mcp-sync.js";
import { registerToolTestRoutes } from "./tool-test.js";
import { registerServiceEditRoutes } from "./service-edit.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;

export function serviceQuery(database: Kysely<DatabaseSchema>) {
  return database.selectFrom("services").innerJoin("resources", "resources.id", "services.id")
    .selectAll("services").select(["resources.name", "resources.description"]);
}

export function presentService(service: ServiceTable & { name: string; description: string }, connectionStatus = "disconnected") {
  return { ...service, enabled: Boolean(service.enabled), headers: JSON.parse(service.headers), connectionStatus };
}

export function parseService(body: Record<string, unknown>): ServiceTable & { name: string; description: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new Error("Service name is required");
  const namespace = body.namespace ?? (name.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || "service");
  if (typeof namespace !== "string" || !/^[A-Za-z0-9_.-]{1,64}$/.test(namespace)) throw new Error("Invalid service namespace");
  if (body.kind !== "mcp") throw new Error("Unsupported service kind");
  const url = new URL(typeof body.url === "string" ? body.url : "");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Expected an HTTP(S) URL without embedded credentials");
  const headers = body.headers ?? {};
  if (!headers || typeof headers !== "object" || Array.isArray(headers) || !Object.values(headers).every((value) => typeof value === "string")) {
    throw new Error("Headers must contain string values");
  }
  new Headers(headers as Record<string, string>);
  const transport = body.transport ?? "http";
  if (transport !== "http" && transport !== "sse") throw new Error("Unsupported MCP transport");
  const timeoutSeconds = body.timeoutSeconds ?? 60;
  if (typeof timeoutSeconds !== "number" || !Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error("Timeout must be positive");
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") throw new Error("Enabled must be a boolean");
  return {
    id: randomUUID(), name, description: typeof body.description === "string" ? body.description : "",
    kind: body.kind, namespace, url: url.toString(), transport,
    headers: JSON.stringify(headers), timeoutSeconds, enabled: body.enabled === true ? 1 : 0,
  } satisfies ServiceTable & { name: string; description: string };
}

export function registerServiceRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser, sources: McpSources) {
  const router = Router();
  router.use(async (request, response, next) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    if (!actor.isAdmin) { response.status(403).json({ error: "Administrator access required" }); return; }
    next();
  });
  registerSyncRoutes(router, database, sources);
  registerToolTestRoutes(router, database, sources);
  registerServiceEditRoutes(router, database, sources);
  router.get("/", async (_request, response) => {
    response.json({ services: (await serviceQuery(database).orderBy("resources.name").execute()).map((service) => presentService(service, sources.status(service))) });
  });
  router.get("/:id", async (request, response) => {
    const service = await serviceQuery(database).where("services.id", "=", request.params.id).executeTakeFirst();
    if (!service) { response.status(404).json({ error: "Service not found" }); return; }
    response.json({ service: presentService(service, sources.status(service)) });
  });
  router.post("/", async (request, response) => {
    let service: ReturnType<typeof parseService>;
    try { service = parseService(request.body ?? {}); }
    catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Invalid service" }); return; }
    if (await database.selectFrom("services").select("id").where("namespace", "=", service.namespace).executeTakeFirst()) {
      response.status(409).json({ error: "Namespace already exists" }); return;
    }
    const { name, description, ...row } = service;
    await database.transaction().execute(async (transaction) => {
      await transaction.insertInto("resources").values({
        id: service.id, type: "service", visibility: "restricted", parentId: null, name, description,
      }).execute();
      await transaction.insertInto("services").values(row).execute();
    });
    response.status(201).json({ service: presentService(service) });
  });
  app.use("/api/admin/services", router);
}
