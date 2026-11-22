import type { GatewayLimits } from "./limits.js";
import { readLimitedText } from "./http-body.js";

function httpUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("Document URL must be a string");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Expected an HTTP(S) document URL without embedded credentials");
  return url.toString();
}

export async function importInput(body: Record<string, unknown>, limits: GatewayLimits, signal: AbortSignal) {
  const inputs = [body.text !== undefined, body.file !== undefined, body.url !== undefined].filter(Boolean).length;
  if (inputs !== 1) throw new Error("Choose exactly one text, file or URL input");
  let text: unknown = body.text;
  let baseUrl = body.baseUrl === undefined ? undefined : httpUrl(body.baseUrl);
  if (body.file !== undefined) {
    if (body.kind !== "openapi" || !body.file || typeof body.file !== "object" || Array.isArray(body.file)) throw new Error("File inputs are supported only for OpenAPI documents");
    text = (body.file as Record<string, unknown>).content;
  }
  if (body.url !== undefined) {
    if (body.kind !== "openapi") throw new Error("URL inputs are supported only for OpenAPI documents");
    const address = httpUrl(body.url);
    const response = await fetch(address, { signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]) });
    if (!response.ok) throw Object.assign(new Error(`Document fetch failed (HTTP ${response.status})`), { status: 502 });
    baseUrl ??= response.url || address;
    text = await readLimitedText(response, limits.importBytes);
  }
  if (typeof text !== "string") throw new Error("Import text or uploaded file content is required");
  if (Buffer.byteLength(text) > limits.importBytes) throw Object.assign(new Error("Import exceeds the configured byte limit"), { status: 413 });
  return { text, baseUrl };
}
