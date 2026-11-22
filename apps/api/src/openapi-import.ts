import { randomUUID } from "node:crypto";
import { parseDocument } from "yaml";
import { assertSchemaBudget, type GatewayLimits } from "./limits.js";
import { defineRestTool } from "./rest-definition.js";
import type { ImportGroup } from "./import-types.js";
import { object, referencedObject, schemaContext } from "./openapi-schema.js";

function serverUrl(document: Record<string, unknown>, path: Record<string, unknown>, operation: Record<string, unknown>, baseUrl?: string) {
  const servers = operation.servers ?? path.servers ?? document.servers ?? [{ url: "/" }];
  if (!Array.isArray(servers) || !servers.length) throw new Error("OpenAPI servers must be a nonempty array");
  const server = object(servers[0]);
  if (typeof server.url !== "string") throw new Error("Server URL is required");
  const variables = server.variables ? object(server.variables) : {};
  const address = server.url.replace(/\{([^{}]+)\}/g, (_match, name: string) => {
    const variable = object(variables[name]);
    if (typeof variable.default !== "string") throw new Error("Server variable needs an explicit default");
    return variable.default;
  });
  let url: URL;
  try { url = baseUrl ? new URL(address, baseUrl) : new URL(address); }
  catch { throw new Error("Relative servers require a document URL or base URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) server URLs are supported");
  return url.toString();
}

export function importOpenApi(text: string, limits: GatewayLimits, baseUrl?: string): ImportGroup[] {
  const parsed = parseDocument(text, { prettyErrors: false, uniqueKeys: true });
  if (parsed.errors.length) throw new Error("OpenAPI JSON/YAML cannot be parsed");
  const document = object(parsed.toJS({ maxAliasCount: 100 }));
  if (typeof document.openapi !== "string" || !/^3\.(0|1)\.\d+$/.test(document.openapi)) throw new Error("Only OpenAPI 3.0.x and 3.1.x are supported; Swagger 2.0 is unsupported");
  assertSchemaBudget(document, limits);
  const groups = new Map<string, ImportGroup>();
  const groupFor = (url: string) => {
    const existing = groups.get(url);
    if (existing) return existing;
    const target = url ? new URL(url) : undefined;
    let namespace = (target ? `${target.host}${target.pathname}` : "unresolved").replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/-+$/g, "").slice(0, 64);
    if ([...groups.values()].some((group) => group.namespace === namespace)) namespace = `${namespace.slice(0, 55)}-${groups.size + 1}`;
    const group = { id: randomUUID(), url, name: target?.hostname ?? "Unresolved target", namespace, headers: {}, operations: [] } as ImportGroup;
    groups.set(url, group);
    return group;
  };
  for (const [pathName, rawPath] of Object.entries(object(document.paths ?? {}))) {
    let path: Record<string, unknown>;
    try { path = referencedObject(document, rawPath); }
    catch (error) {
      groupFor("").operations.push({ id: randomUUID(), label: pathName, supported: false, reasons: [error instanceof Error ? error.message : "Invalid path reference"], definition: { name: "unresolved", path: pathName } });
      continue;
    }
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options", "trace"]) {
      if (!path[method]) continue;
      const operation = object(path[method]);
      let url = "";
      let reasons: string[] = [];
      const definition: Record<string, unknown> = { name: operation.operationId ?? `${method}_${pathName.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "") || "root"}`,
        description: operation.description ?? operation.summary ?? "", method: method.toUpperCase(), path: pathName };
      try {
        url = serverUrl(document, path, operation, baseUrl);
        const context = schemaContext(document);
        const parameters = new Map<string, Record<string, unknown>>();
        for (const list of [path.parameters ?? [], operation.parameters ?? []]) {
          if (!Array.isArray(list)) throw new Error("Parameters must be an array");
          for (const raw of list) {
            const parameter = referencedObject(document, raw);
            if (typeof parameter.name !== "string" || typeof parameter.in !== "string") throw new Error("Parameter name and location are required");
            parameters.set(`${parameter.in}:${parameter.name}`, parameter);
          }
        }
        const example: Record<string, unknown> = {};
        definition.parameters = [...parameters.values()].filter((parameter) => !(parameter.in === "header" && ["accept", "content-type", "authorization"].includes(String(parameter.name).toLowerCase())))
          .map((parameter) => {
            if (parameter.content) throw new Error("Content-based parameter serialization is unsupported");
            if (parameter.allowReserved === true) throw new Error("allowReserved query serialization is unsupported");
            const schema = context.normalize(parameter.schema ?? {});
            const value = parameter.example ?? (parameter.schema && object(parameter.schema).example);
            if (value !== undefined) {
              const group = parameter.in === "header" ? "headers" : String(parameter.in);
              const values = (example[group] ??= {}) as Record<string, unknown>;
              Object.defineProperty(values, String(parameter.name), { value, enumerable: true, configurable: true });
            }
            return { in: parameter.in, name: parameter.name, schema, required: parameter.required, style: parameter.style, explode: parameter.explode };
          });
        if (operation.requestBody) {
          const body = referencedObject(document, operation.requestBody);
          const content = object(body.content);
          const mediaType = Object.hasOwn(content, "application/json") ? "application/json" : Object.keys(content).find((type) => type.endsWith("+json"));
          if (!mediaType) throw new Error("Only JSON request bodies are supported");
          const media = object(content[mediaType]);
          definition.bodySchema = context.normalize(media.schema ?? {});
          definition.bodyRequired = body.required;
          const value = media.example;
          if (value !== undefined) example.body = value;
        }
        definition.schemaDefs = context.definitions;
        definition.example = example;
        defineRestTool(definition, limits);
      } catch (error) { reasons = [error instanceof Error ? error.message : "Unsupported operation"]; }
      groupFor(url).operations.push({ id: randomUUID(), label: `${method.toUpperCase()} ${pathName}`, supported: !reasons.length, reasons, definition });
    }
  }
  return [...groups.values()];
}
