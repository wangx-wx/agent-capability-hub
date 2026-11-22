import { randomUUID } from "node:crypto";
import type { JsonSchemaType } from "@modelcontextprotocol/server";
import { curlTokens } from "./curl-tokens.js";
import { defineRestTool, type RestParameter } from "./rest-definition.js";
import { assertSchemaBudget, type GatewayLimits } from "./limits.js";
import type { ImportGroup } from "./import-types.js";

function inferSchema(value: unknown): JsonSchemaType {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    const schemas = [...new Map(value.map((item) => { const schema = inferSchema(item); return [JSON.stringify(schema), schema]; })).values()];
    return { type: "array", items: schemas.length === 1 ? schemas[0] : schemas.length ? { anyOf: schemas } : {} };
  }
  if (typeof value === "object") {
    const properties: Record<string, JsonSchemaType> = Object.create(null);
    for (const [name, child] of Object.entries(value!)) properties[name] = inferSchema(child);
    return { type: "object", properties };
  }
  return { type: typeof value === "number" ? Number.isInteger(value) ? "integer" : "number" : typeof value as "string" | "boolean" };
}

export function importCurl(text: string, limits: GatewayLimits): ImportGroup[] {
  const tokens = curlTokens(text.trim());
  let address = "";
  let method = "";
  let data: string | undefined;
  const rawHeaders: Record<string, string> = Object.create(null);
  const setHeader = (name: string, value: string) => {
    if (Object.keys(rawHeaders).some((existing) => existing.toLowerCase() === name.toLowerCase())) throw new Error("Repeated scalar headers are unsupported; choose one explicit value");
    new Headers([[name, value]]);
    rawHeaders[name] = value;
  };
  for (let index = 0; index < tokens.length; index++) {
    let flag = tokens[index];
    let inline: string | undefined;
    if (flag.startsWith("--") && flag.includes("=")) { inline = flag.slice(flag.indexOf("=") + 1); flag = flag.slice(0, flag.indexOf("=")); }
    else if (/^-[XHdu].+/.test(flag)) { inline = flag.slice(2); flag = flag.slice(0, 2); }
    const value = () => { const result = inline ?? tokens[++index]; if (result === undefined) throw new Error(`Missing value for ${flag}`); return result; };
    if (flag === "-X" || flag === "--request") method = value().toUpperCase();
    else if (flag === "-H" || flag === "--header") {
      const header = value();
      const colon = header.indexOf(":");
      if (colon < 1) throw new Error("Invalid cURL header");
      setHeader(header.slice(0, colon).trim(), header.slice(colon + 1).trim());
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(flag)) {
      if (data !== undefined) throw new Error("Multiple cURL data fragments are unsupported");
      data = value();
      if (data.startsWith("@")) throw new Error("cURL file inputs are not read; paste JSON data explicitly");
    } else if (flag === "--url") { if (address) throw new Error("Multiple cURL URLs are unsupported"); address = value(); }
    else if (flag === "-u" || flag === "--user") {
      const credential = value();
      if (!credential.includes(":")) throw new Error("Provide the complete Basic credential; interactive password prompts are unsupported");
      setHeader("Authorization", `Basic ${Buffer.from(credential).toString("base64")}`);
    } else if (flag === "-I" || flag === "--head") method = "HEAD";
    else if (["-s", "-S", "-sS", "--silent", "--show-error", "--compressed"].includes(flag)) continue;
    else if (flag.startsWith("-")) throw new Error(`Unsupported cURL option: ${flag}`);
    else { if (address) throw new Error("Multiple cURL URLs are unsupported"); address = flag; }
  }
  const url = new URL(address);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) cURL targets are supported");
  if (url.username || url.password) setHeader("Authorization", `Basic ${Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString("base64")}`);
  const headers: Record<string, string> = Object.create(null);
  const example: Record<string, unknown> = {};
  const parameters: RestParameter[] = [];
  const query: Record<string, string | string[]> = Object.create(null);
  for (const [name, value] of url.searchParams) {
    const old = query[name];
    query[name] = old === undefined ? value : Array.isArray(old) ? [...old, value] : [old, value];
  }
  for (const [name, value] of Object.entries(query)) parameters.push({ in: "query", name, schema: Array.isArray(value) ? { type: "array", items: { type: "string" } } : { type: "string" } });
  if (parameters.length) example.query = query;
  const businessHeaders: Record<string, string> = Object.create(null);
  for (const [name, value] of Object.entries(rawHeaders)) {
    if (["authorization", "proxy-authorization", "x-api-key", "api-key", "x-auth-token", "cookie", "content-type"].includes(name.toLowerCase())) headers[name] = value;
    else { parameters.push({ in: "header", name, schema: { type: "string" } }); businessHeaders[name] = value; }
  }
  if (Object.keys(businessHeaders).length) example.headers = businessHeaders;
  let bodySchema: JsonSchemaType | undefined;
  if (data !== undefined) {
    let body: unknown;
    try { body = JSON.parse(data); } catch { throw new Error("Only JSON cURL request bodies are supported"); }
    assertSchemaBudget(body, limits);
    bodySchema = inferSchema(body);
    example.body = body;
  }
  method ||= data === undefined ? "GET" : "POST";
  const path = url.pathname;
  const definition: Record<string, unknown> = {
    name: `${method.toLowerCase()}_${path.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "") || "root"}`,
    method, path, parameters, bodySchema, example,
  };
  let reasons: string[] = [];
  try { defineRestTool(definition, limits); } catch (error) { reasons = [error instanceof Error ? error.message : "Unsupported operation"]; }
  return [{ id: randomUUID(), url: url.origin, name: url.hostname, namespace: url.hostname.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 64), headers,
    operations: [{ id: randomUUID(), label: `${method} ${path}`, supported: !reasons.length, reasons, definition }] }];
}
