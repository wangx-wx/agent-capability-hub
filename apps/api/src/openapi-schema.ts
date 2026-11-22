import { createHash } from "node:crypto";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an OpenAPI object");
  return value as Record<string, unknown>;
}

export function documentReference(document: Record<string, unknown>, reference: unknown): unknown {
  if (typeof reference !== "string" || !reference.startsWith("#")) throw new Error("External references are not fetched");
  if (reference === "#") return document;
  if (!reference.startsWith("#/")) throw new Error("Unsupported internal reference syntax");
  let value: unknown = document;
  for (const part of reference.slice(2).split("/")) {
    const key = decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~");
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) throw new Error("Unresolved internal reference");
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export function referencedObject(document: Record<string, unknown>, value: unknown, seen = new Set<string>()): Record<string, unknown> {
  const node = object(value);
  if (!node.$ref) return node;
  if (typeof node.$ref !== "string" || seen.has(node.$ref)) throw new Error("Invalid recursive structural reference");
  seen.add(node.$ref);
  const { $ref, ...siblings } = node;
  return { ...referencedObject(document, documentReference(document, $ref), seen), ...siblings };
}

export function schemaContext(document: Record<string, unknown>) {
  const definitions: Record<string, unknown> = Object.create(null);
  const normalize = (value: unknown): unknown => {
    if (typeof value === "boolean") return value;
    const node = object(value);
    const result = { ...node };
    if (node.$ref !== undefined) {
      const target = documentReference(document, node.$ref);
      const key = `ref_${createHash("sha256").update(String(node.$ref)).digest("hex").slice(0, 16)}`;
      if (!Object.hasOwn(definitions, key)) { definitions[key] = {}; definitions[key] = normalize(target); }
      result.$ref = `#/$defs/${key}`;
    }
    for (const keyword of ["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]) {
      if (node[keyword] !== undefined) result[keyword] = Object.fromEntries(Object.entries(object(node[keyword])).map(([name, schema]) => [name, normalize(schema)]));
    }
    for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
      if (node[keyword] !== undefined) {
        if (!Array.isArray(node[keyword])) throw new Error("Invalid schema composition");
        result[keyword] = (node[keyword] as unknown[]).map(normalize);
      }
    }
    for (const keyword of ["items", "additionalItems", "additionalProperties", "propertyNames", "contains", "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems"]) {
      if (node[keyword] !== undefined) result[keyword] = Array.isArray(node[keyword]) ? (node[keyword] as unknown[]).map(normalize) : normalize(node[keyword]);
    }
    return result;
  };
  return { definitions, normalize };
}
