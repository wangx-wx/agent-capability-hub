import { randomUUID } from "node:crypto";
import { Router, type Express, type Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";
import type { GatewayLimits } from "./limits.js";
import type { ImportPreview } from "./import-types.js";
import { importCurl } from "./curl-import.js";
import { confirmImport } from "./import-confirm.js";

type ResolveUser = (request: Request) => Promise<{ id: string; isAdmin: boolean } | null>;

export function registerImportRoutes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveUser, limits: GatewayLimits) {
  const previews = new Map<string, ImportPreview>();
  const router = Router();
  router.use(async (request, response, next) => {
    const actor = await resolveUser(request);
    if (!actor) { response.status(401).json({ error: "Authentication required" }); return; }
    if (!actor.isAdmin) { response.status(403).json({ error: "Administrator access required" }); return; }
    response.locals.actorId = actor.id;
    next();
  });
  router.post("/preview", async (request, response) => {
    if (request.body?.kind !== "curl") { response.status(400).json({ error: "Unsupported import kind" }); return; }
    const text = request.body?.text;
    if (typeof text !== "string") { response.status(400).json({ error: "Import text is required" }); return; }
    if (Buffer.byteLength(text) > limits.importBytes) { response.status(413).json({ error: "Import exceeds the configured byte limit" }); return; }
    let preview: ImportPreview;
    try {
      preview = { id: randomUUID(), kind: "curl", groups: importCurl(text, limits) };
      if (Buffer.byteLength(JSON.stringify(preview)) > limits.importBytes) throw new Error("Normalized import exceeds the configured byte budget");
    } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : "Import failed" }); return; }
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
