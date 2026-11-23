import { randomUUID } from "node:crypto";
import { Router, type Express, type Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";
import type { GatewayLimits } from "../../config/limits.js";
import type { ImportPreview } from "./types.js";
import { importCurl } from "./curl/parser.js";
import { confirmImport } from "./confirm.js";
import { importOpenApi } from "./openapi/parser.js";
import { importInput } from "./input.js";
import { targetImport } from "./targets.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;

export function registerImportRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser, limits: GatewayLimits) {
  const previews = new Map<string, ImportPreview>();
  const generations = new Map<string, number>();
  const router = Router();
  router.use(async (request, response, next) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    if (!actor.isAdmin) { response.status(403).json({ error: "Administrator access required" }); return; }
    response.locals.actorId = actor.id;
    next();
  });
  router.post("/preview", async (request, response) => {
    const kind = request.body?.kind;
    if (kind !== "curl" && kind !== "openapi") { response.status(400).json({ error: "Unsupported import kind" }); return; }
    const actorId = response.locals.actorId as string;
    const generation = (generations.get(actorId) ?? 0) + 1;
    generations.set(actorId, generation);
    previews.delete(actorId);
    const controller = new AbortController();
    const onClose = () => { if (!response.writableEnded) controller.abort(); };
    response.once("close", onClose);
    let preview: ImportPreview;
    try {
      const { text, baseUrl } = await importInput(request.body, limits, controller.signal);
      preview = { id: randomUUID(), kind, groups: kind === "curl" ? importCurl(text, limits) : importOpenApi(text, limits, baseUrl) };
      await targetImport(database, preview, request.body.targetServices, limits);
      if (Buffer.byteLength(JSON.stringify(preview)) > limits.importBytes) throw new Error("Normalized import exceeds the configured byte budget");
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error && (error.status === 413 || error.status === 502) ? error.status : 400;
      response.status(status).json({ error: error instanceof Error ? error.message : "Import failed" }); return;
    } finally { response.removeListener("close", onClose); controller.abort(); }
    if (generation !== generations.get(actorId)) { response.status(409).json({ error: "A newer import preview has replaced this request" }); return; }
    previews.set(response.locals.actorId, preview);
    response.json({ preview });
  });
  router.post("/confirm", async (request, response) => {
    const preview = previews.get(response.locals.actorId);
    if (!preview || preview.id !== request.body?.previewId) { response.status(409).json({ error: "Preview is stale; import again" }); return; }
    try {
      const result = await confirmImport(database, preview, request.body.groups, limits);
      previews.delete(response.locals.actorId);
      response.json(result);
    } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Import confirmation failed" }); }
  });
  app.use("/api/admin/imports", router);
}
