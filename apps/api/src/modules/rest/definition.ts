import type { JsonSchemaType, Tool } from "@modelcontextprotocol/server";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import { assertSchemaBudget, gatewayLimits, type GatewayLimits } from "../../config/limits.js";
import { assertParameterSerialization } from "./parameters.js";

export interface RestParameter {
  in: "path" | "query" | "header";
  name: string;
  schema: JsonSchemaType;
  required?: boolean;
  style?: string;
  explode?: boolean;
}
export interface RestMapping {
  method: string;
  path: string;
  parameters: RestParameter[];
  bodySchema?: JsonSchemaType | boolean;
  bodyRequired?: boolean;
  bodyContentType?: string;
  schemaDefs?: Record<string, unknown>;
}
export type RestTool = Tool & { rest: RestMapping; example?: Record<string, unknown> };

export function defineRestTool(body: Record<string, unknown>, limits: GatewayLimits = gatewayLimits()): RestTool {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(name)) throw new Error("Invalid tool name");
  const method = typeof body.method === "string" ? body.method.toUpperCase() : "";
  if (!["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(method)) throw new Error("Unsupported HTTP method");
  const path = typeof body.path === "string" ? body.path : "";
  if (!path.startsWith("/") || path.includes("?") || path.includes("#") || path.includes("://")) throw new Error("Expected a relative path template without query or fragment");
  const parameters = body.parameters ?? [];
  if (!Array.isArray(parameters)) throw new Error("Parameters must be an array");
  const groups: Record<string, { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false }> = {};
  const required: string[] = [];
  const schemaDefs = body.schemaDefs as Record<string, unknown> | undefined;
  if (schemaDefs !== undefined && (!schemaDefs || typeof schemaDefs !== "object" || Array.isArray(schemaDefs))) throw new Error("Invalid local schema definitions");
  for (const parameter of parameters as RestParameter[]) {
    if (!["path", "query", "header"].includes(parameter.in)) throw new Error("Only path, query and header parameters are supported");
    if (!parameter.name || typeof parameter.name !== "string" || !parameter.schema || typeof parameter.schema !== "object") throw new Error("Parameter name and schema are required");
    assertParameterSerialization(parameter.schema as Record<string, unknown>, parameter.in, schemaDefs);
    const style = parameter.style ?? (parameter.in === "query" ? "form" : "simple");
    if (style !== (parameter.in === "query" ? "form" : "simple")) throw new Error("Unsupported parameter style");
    if (parameter.explode !== undefined && typeof parameter.explode !== "boolean") throw new Error("Explode must be a boolean");
    if (parameter.required !== undefined && typeof parameter.required !== "boolean") throw new Error("Required must be a boolean");
    const groupName = parameter.in === "header" ? "headers" : parameter.in;
    const group = groups[groupName] ??= { type: "object", properties: {}, required: [], additionalProperties: false };
    if (Object.hasOwn(group.properties, parameter.name)) throw new Error("Duplicate parameter in the same location");
    Object.defineProperty(group.properties, parameter.name, { value: parameter.schema, enumerable: true, configurable: true });
    if (parameter.required || parameter.in === "path") {
      group.required.push(parameter.name);
      if (!required.includes(groupName)) required.push(groupName);
    }
    if (parameter.in === "path" && !path.includes(`{${parameter.name}}`)) throw new Error("Path parameter has no matching placeholder");
  }
  for (const match of path.matchAll(/\{([^{}]+)\}/g)) {
    if (!(parameters as RestParameter[]).some((parameter) => parameter.in === "path" && parameter.name === match[1])) throw new Error("Path placeholder has no parameter definition");
  }
  const properties: Record<string, unknown> = { ...groups };
  if (body.bodySchema !== undefined) {
    if (typeof body.bodySchema !== "boolean" && (!body.bodySchema || typeof body.bodySchema !== "object" || Array.isArray(body.bodySchema))) throw new Error("Invalid JSON body schema");
    if (method === "GET" || method === "HEAD") throw new Error("JSON bodies on GET/HEAD are unsupported");
    properties.body = body.bodySchema;
    if (body.bodyRequired === true) required.push("body");
  } else if (body.bodyRequired) throw new Error("Required body needs a schema");
  const bodyContentType = body.bodyContentType;
  if (bodyContentType !== undefined && (typeof bodyContentType !== "string" || !/^application\/(?:json|[A-Za-z0-9!#$&^_.+-]+\+json)$/.test(bodyContentType))) throw new Error("Only JSON body content types are supported");
  const inputSchema = { type: "object", properties, required, additionalProperties: false, ...(schemaDefs ? { $defs: schemaDefs } : {}) } as Tool["inputSchema"];
  assertSchemaBudget(inputSchema, limits);
  new AjvJsonSchemaValidator().getValidator(inputSchema as JsonSchemaType);
  return {
    name, description: typeof body.description === "string" ? body.description : "", inputSchema,
    rest: { method, path, parameters: parameters as RestParameter[], bodySchema: body.bodySchema as JsonSchemaType | boolean | undefined, bodyRequired: body.bodyRequired === true, bodyContentType: bodyContentType as string | undefined, schemaDefs },
    example: body.example as Record<string, unknown> | undefined,
  };
}
