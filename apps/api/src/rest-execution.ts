import type { CallToolResult } from "@modelcontextprotocol/server";
import type { ServiceTable } from "./service-schema.js";
import type { RestTool } from "./rest-definition.js";
import { resolveServiceCredentials, type CallerContext } from "./credentials.js";
import { readLimitedText } from "./http-body.js";
import type { GatewayLimits } from "./limits.js";

function scalar(value: unknown) {
  if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new Error("Only scalar path/query/header values are supported");
  return String(value);
}

export async function executeRest(service: ServiceTable, tool: RestTool, args: Record<string, unknown>, caller: CallerContext, limits: GatewayLimits, signal?: AbortSignal): Promise<CallToolResult> {
  const url = new URL(service.url);
  let path = tool.rest.path;
  const headers = new Headers();
  for (const parameter of tool.rest.parameters) {
    const group = args[parameter.in === "header" ? "headers" : parameter.in] as Record<string, unknown> | undefined;
    if (!group || !Object.hasOwn(group, parameter.name)) continue;
    const value = group[parameter.name];
    if (parameter.in === "path") path = path.split(`{${parameter.name}}`).join(encodeURIComponent(scalar(value)).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`));
    else if (parameter.in === "header") headers.set(parameter.name, scalar(value));
    else if (Array.isArray(value)) {
      if (parameter.explode === false) url.searchParams.append(parameter.name, value.map(scalar).join(","));
      else for (const item of value) url.searchParams.append(parameter.name, scalar(item));
    } else url.searchParams.append(parameter.name, scalar(value));
  }
  if (path.split("/").some((segment) => [".", ".."].includes(segment.replace(/%2e/gi, ".")))) throw new Error("Dot path segments cannot be represented without URL normalization");
  url.pathname = url.pathname.replace(/\/$/, "") + path;
  const body = Object.hasOwn(args, "body") ? JSON.stringify(args.body) : undefined;
  if (body !== undefined) headers.set("Content-Type", tool.rest.bodyContentType ?? "application/json");
  for (const [name, value] of Object.entries(resolveServiceCredentials(service, caller))) headers.set(name, value);
  if (body && Buffer.byteLength(body) > limits.requestBytes) throw new Error("Request exceeds the configured byte limit");
  const timeout = AbortSignal.timeout(service.timeoutSeconds * 1000);
  const response = await fetch(url, { method: tool.rest.method, headers, body, redirect: "error", signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (response.status !== 204 && contentType && !contentType.startsWith("text/") && contentType !== "application/json" && !contentType.endsWith("+json")) {
    await response.body?.cancel();
    throw new Error("Binary REST responses are unsupported");
  }
  const text = await readLimitedText(response, limits.responseBytes);
  return { content: text ? [{ type: "text", text }] : [], isError: !response.ok };
}
