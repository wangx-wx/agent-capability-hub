const allTypes = ["null", "string", "number", "integer", "boolean", "array", "object"];
type Schema = Record<string, unknown> | boolean;

function localReference(reference: unknown, definitions: Record<string, unknown>): Schema {
  if (typeof reference !== "string" || !reference.startsWith("#/$defs/")) throw new Error("Unsupported parameter schema reference");
  let value: unknown = { $defs: definitions };
  for (const key of reference.slice(2).split("/")) value = (value as Record<string, unknown>)?.[decodeURIComponent(key).replace(/~1/g, "/").replace(/~0/g, "~")];
  if (typeof value !== "boolean" && (!value || typeof value !== "object")) throw new Error("Unresolved parameter schema reference");
  return value as Schema;
}

function possibleTypes(schema: Schema, definitions: Record<string, unknown>, seen = new Set<Schema>()): Set<string> {
  if (schema === false) return new Set();
  if (schema === true || seen.has(schema)) return new Set(allTypes);
  seen = new Set(seen).add(schema);
  const declared = schema.type === "number" ? ["number", "integer"] : Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : allTypes;
  let types = new Set<string>(declared as string[]);
  if (types.has("number")) types.add("integer");
  const intersect = (other: Set<string>) => { types = new Set([...types].filter((type) => other.has(type))); };
  if (schema.$ref) intersect(possibleTypes(localReference(schema.$ref, definitions), definitions, seen));
  for (const branch of (schema.allOf ?? []) as Schema[]) intersect(possibleTypes(branch, definitions, seen));
  for (const keyword of ["anyOf", "oneOf"]) {
    if (Array.isArray(schema[keyword])) intersect(new Set((schema[keyword] as Schema[]).flatMap((branch) => [...possibleTypes(branch, definitions, seen)])));
  }
  const values = Object.hasOwn(schema, "const") ? [schema.const] : schema.enum;
  if (Array.isArray(values)) intersect(new Set(values.map((value) => value === null ? "null" : Array.isArray(value) ? "array" : typeof value === "number" && Number.isInteger(value) ? "integer" : typeof value)));
  return types;
}

function arrayItems(schema: Schema, definitions: Record<string, unknown>, seen = new Set<Schema>()): Schema[] {
  if (typeof schema === "boolean" || seen.has(schema)) return [];
  seen = new Set(seen).add(schema);
  const items = schema.items === undefined ? [] : [schema.items as Schema];
  if (schema.$ref) items.push(...arrayItems(localReference(schema.$ref, definitions), definitions, seen));
  for (const branch of (schema.allOf ?? []) as Schema[]) items.push(...arrayItems(branch, definitions, seen));
  for (const keyword of ["anyOf", "oneOf"]) {
    for (const branch of (schema[keyword] ?? []) as Schema[]) {
      if (!possibleTypes(branch, definitions).has("array")) continue;
      const candidates = arrayItems(branch, definitions, seen);
      if (!candidates.length) return [true];
      items.push(...candidates);
    }
  }
  return items;
}

export function assertParameterSerialization(schema: Record<string, unknown>, location: string, definitions: Record<string, unknown> = {}) {
  const types = possibleTypes(schema, definitions);
  if (types.has("object") || (types.has("array") && location !== "query")) throw new Error("Object parameters and path/header arrays are unsupported");
  if (types.has("array")) {
    const items = arrayItems(schema, definitions);
    if (!items.length || items.some((item) => [...possibleTypes(item, definitions)].some((type) => type === "object" || type === "array"))) throw new Error("Query array parameters require scalar item schemas");
  }
}
