import { createHash } from "node:crypto";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an OpenAPI object");
  return value as Record<string, unknown>;
}

export function documentReference(document: Record<string, unknown>, reference: unknown): unknown {
  if (typeof reference !== "string" || !reference.startsWith("#")) throw new Error("External references are not fetched");
  if (reference === "#") return document;
  if (!reference.startsWith("#/")) {
    const anchor = decodeURIComponent(reference.slice(1));
    const matches: Record<string, unknown>[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (node.$anchor === anchor) matches.push(node);
      for (const child of Object.values(node)) visit(child);
    };
    visit(document);
    if (matches.length !== 1) throw new Error("Unresolved or ambiguous internal schema anchor");
    return matches[0];
  }
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
  const referenceKeys = new Map<unknown, string>();
  const legacy = String(document.openapi).startsWith("3.0.");
  const readOnly = (value: unknown, seen = new Set<string>()): boolean => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const node = object(value);
    if (node.readOnly === true) return true;
    if (typeof node.$ref === "string" && !seen.has(node.$ref)) {
      seen.add(node.$ref);
      if (readOnly(documentReference(document, node.$ref), seen)) return true;
    }
    return Array.isArray(node.allOf) && node.allOf.some((schema) => readOnly(schema, seen));
  };
  const normalize = (value: unknown, inheritedDialect: unknown = document.jsonSchemaDialect): unknown => {
    if (typeof value === "boolean") return value;
    const node = object(value);
    const result = { ...node };
    if (node.$id !== undefined || node.$dynamicRef !== undefined || node.$dynamicAnchor !== undefined) throw new Error("Scoped schema IDs and dynamic references are unsupported");
    const dialect = node.$schema ?? inheritedDialect;
    if (!legacy && dialect !== undefined && !["https://json-schema.org/draft/2020-12/schema", "https://spec.openapis.org/oas/3.1/dialect/base"].includes(String(dialect))) throw new Error("Unsupported JSON Schema dialect");
    if (node.$vocabulary !== undefined) {
      const supported = new Set(["core", "applicator", "unevaluated", "validation", "meta-data", "format-annotation", "content"].map((name) => `https://json-schema.org/draft/2020-12/vocab/${name}`));
      supported.add("https://spec.openapis.org/oas/3.1/vocab/base");
      for (const [name, required] of Object.entries(object(node.$vocabulary))) {
        if (typeof required !== "boolean" || (required && !supported.has(name))) throw new Error("Unsupported required JSON Schema vocabulary");
      }
    }
    if (result.$schema === "https://spec.openapis.org/oas/3.1/dialect/base") result.$schema = "https://json-schema.org/draft/2020-12/schema";
    if (legacy) {
      if (Array.isArray(node.type)) throw new Error("OpenAPI 3.0 type arrays are unsupported");
      if (node.nullable !== undefined && typeof node.nullable !== "boolean") throw new Error("Invalid OpenAPI nullable value");
      if (node.nullable === true && typeof node.type === "string") result.type = [node.type, "null"];
      delete result.nullable;
      for (const [exclusive, bound] of [["exclusiveMinimum", "minimum"], ["exclusiveMaximum", "maximum"]]) {
        if (node[exclusive] === undefined) continue;
        if (typeof node[exclusive] !== "boolean") throw new Error("OpenAPI 3.0 exclusive bounds must be boolean");
        if (node[exclusive]) {
          if (typeof node[bound] !== "number") throw new Error("Exclusive bound requires its numeric limit");
          result[exclusive] = node[bound];
        } else delete result[exclusive];
      }
    }
    if (node.$ref !== undefined) {
      const target = documentReference(document, node.$ref);
      const key = referenceKeys.get(target) ?? `ref_${createHash("sha256").update(String(node.$ref)).digest("hex").slice(0, 16)}`;
      referenceKeys.set(target, key);
      if (!Object.hasOwn(definitions, key)) { definitions[key] = {}; definitions[key] = normalize(target); }
      result.$ref = `#/$defs/${key}`;
    }
    for (const keyword of ["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]) {
      if (node[keyword] !== undefined) result[keyword] = Object.fromEntries(Object.entries(object(node[keyword])).map(([name, schema]) => [name, normalize(schema, dialect)]));
    }
    for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
      if (node[keyword] !== undefined) {
        if (!Array.isArray(node[keyword])) throw new Error("Invalid schema composition");
        result[keyword] = (node[keyword] as unknown[]).map((schema) => normalize(schema, dialect));
      }
    }
    for (const keyword of ["items", "additionalItems", "additionalProperties", "propertyNames", "contains", "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems"]) {
      if (node[keyword] !== undefined) result[keyword] = Array.isArray(node[keyword]) ? (node[keyword] as unknown[]).map((schema) => normalize(schema, dialect)) : normalize(node[keyword], dialect);
    }
    if (Array.isArray(node.required) && node.properties) {
      const properties = object(node.properties);
      result.required = node.required.filter((name) => !readOnly(properties[String(name)]));
    }
    return result;
  };
  return { definitions, normalize };
}
