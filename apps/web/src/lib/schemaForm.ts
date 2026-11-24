export interface SchemaField {
  key: string;
  path: string[];
  group?: "path" | "query" | "headers" | "body";
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "enum";
  enumValues?: Array<string | number | boolean>;
  required: boolean;
  nullable?: boolean;
  description?: string;
}

export interface SchemaInspection {
  supported: boolean;
  fields: SchemaField[];
  reason?: string;
}

export interface ParamTableRow {
  group: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
}

const REST_GROUPS = new Set(["path", "query", "headers", "body"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasComplexKeywords(node: Record<string, unknown>): boolean {
  return (
    node.$ref !== undefined ||
    node.$defs !== undefined ||
    node.oneOf !== undefined ||
    node.anyOf !== undefined ||
    node.allOf !== undefined ||
    node.not !== undefined
  );
}

function parseLeafField(
  path: string[],
  name: string,
  node: unknown,
  required: boolean,
  group?: SchemaField["group"],
): SchemaField | null {
  if (!isPlainRecord(node) || hasComplexKeywords(node)) return null;

  if (Array.isArray(node.enum) && node.enum.length > 0) {
    const validEnum = node.enum.every(
      (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );
    if (!validEnum) return null;
    return {
      key: path.join("."),
      path,
      group,
      name,
      type: "enum",
      enumValues: node.enum as Array<string | number | boolean>,
      required,
      description: typeof node.description === "string" ? node.description : undefined,
    };
  }

  let rawType = node.type;
  let nullable = false;
  if (Array.isArray(rawType)) {
    const nonNull = rawType.filter((entry) => entry !== "null");
    nullable = rawType.includes("null");
    if (nonNull.length !== 1) return null;
    rawType = nonNull[0];
  }

  if (rawType === "string" || rawType === "number" || rawType === "integer" || rawType === "boolean") {
    return {
      key: path.join("."),
      path,
      group,
      name,
      type: rawType,
      required,
      nullable,
      description: typeof node.description === "string" ? node.description : undefined,
    };
  }

  return null;
}

/**
 * Inspects an MCP/REST JSON Schema and determines whether a lightweight flat
 * parameter form can losslessly represent every field without dropping constraints.
 */
export function inspectToolSchema(schema: Record<string, unknown> | undefined): SchemaInspection {
  if (!schema || !isPlainRecord(schema)) {
    return { supported: true, fields: [] };
  }
  if (hasComplexKeywords(schema)) {
    return {
      supported: false,
      fields: [],
      reason: "参数 Schema 包含组合关键字或引用（$ref / oneOf / anyOf / allOf），请使用 JSON 参数编辑器。",
    };
  }
  const properties = isPlainRecord(schema.properties) ? schema.properties : {};
  const requiredTop = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
  const fields: SchemaField[] = [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    if (!isPlainRecord(propSchema)) {
      return {
        supported: false,
        fields: [],
        reason: `字段 ${propName} 包含布尔或非常规 Schema 约束，请使用 JSON 参数编辑器。`,
      };
    }

    if (REST_GROUPS.has(propName) && propSchema.type === "object" && isPlainRecord(propSchema.properties)) {
      if (hasComplexKeywords(propSchema)) {
        return {
          supported: false,
          fields: [],
          reason: `参数组 ${propName} 包含组合关键字或引用，请使用 JSON 参数编辑器。`,
        };
      }
      const groupRequired = new Set(
        Array.isArray(propSchema.required) ? propSchema.required.map(String) : [],
      );
      const group = propName as SchemaField["group"];
      for (const [childName, childSchema] of Object.entries(propSchema.properties)) {
        const parsed = parseLeafField(
          [propName, childName],
          childName,
          childSchema,
          groupRequired.has(childName) || (requiredTop.has(propName) && groupRequired.has(childName)),
          group,
        );
        if (!parsed) {
          return {
            supported: false,
            fields: [],
            reason: `参数 ${propName}.${childName} 为嵌套对象、数组或引用，已自动切换至 JSON 参数编辑器。`,
          };
        }
        fields.push(parsed);
      }
      continue;
    }

    const parsed = parseLeafField([propName], propName, propSchema, requiredTop.has(propName));
    if (!parsed) {
      return {
        supported: false,
        fields: [],
        reason: `参数 ${propName} 为对象、数组或复杂约束，已自动切换至 JSON 参数编辑器。`,
      };
    }
    fields.push(parsed);
  }

  return { supported: true, fields };
}

export type FormFieldEntry =
  | { mode: "unset" }
  | { mode: "null" }
  | { mode: "value"; value: string | boolean };

/** Maps existing JSON arguments into flat form entries while preserving unset vs explicit values. */
export function argsToFormValues(
  fields: SchemaField[],
  args: Record<string, unknown>,
): Record<string, FormFieldEntry> {
  const result: Record<string, FormFieldEntry> = {};
  for (const field of fields) {
    let cursor: unknown = args;
    let found = true;
    for (const segment of field.path) {
      if (isPlainRecord(cursor) && Object.hasOwn(cursor, segment)) {
        cursor = cursor[segment];
      } else {
        found = false;
        break;
      }
    }
    if (!found || cursor === undefined) {
      result[field.key] = { mode: "unset" };
    } else if (cursor === null) {
      result[field.key] = { mode: "null" };
    } else if (field.type === "boolean") {
      result[field.key] = { mode: "value", value: Boolean(cursor) };
    } else {
      result[field.key] = { mode: "value", value: String(cursor) };
    }
  }
  return result;
}

/** Builds structured arguments object from form entries, omitting unset optional fields. */
export function formValuesToArgs(
  fields: SchemaField[],
  entries: Record<string, FormFieldEntry>,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const output: Record<string, unknown> = {};

  for (const field of fields) {
    const entry = entries[field.key] ?? { mode: "unset" };
    if (entry.mode === "unset") {
      if (field.required) {
        return { ok: false, error: `请填写必填参数 ${field.key}` };
      }
      continue;
    }

    let typedValue: unknown;
    if (entry.mode === "null") {
      typedValue = null;
    } else if (field.type === "boolean") {
      typedValue = Boolean(entry.value);
    } else if (field.type === "number" || field.type === "integer") {
      const raw = String(entry.value).trim();
      if (!raw) {
        if (field.required) return { ok: false, error: `请填写必填参数 ${field.key}` };
        continue;
      }
      const num = Number(raw);
      if (!Number.isFinite(num) || (field.type === "integer" && !Number.isInteger(num))) {
        return {
          ok: false,
          error: `参数 ${field.key} 必须为有效的${field.type === "integer" ? "整数" : "数字"}`,
        };
      }
      typedValue = num;
    } else if (field.type === "enum" && field.enumValues) {
      const matched = field.enumValues.find((candidate) => String(candidate) === String(entry.value));
      typedValue = matched ?? String(entry.value);
    } else {
      typedValue = String(entry.value);
    }

    if (field.path.length === 1) {
      output[field.path[0]] = typedValue;
    } else {
      const [group, name] = field.path;
      const existing = isPlainRecord(output[group]) ? (output[group] as Record<string, unknown>) : {};
      existing[name] = typedValue;
      output[group] = existing;
    }
  }

  return { ok: true, value: output };
}

function summarizeType(node: unknown): string {
  if (typeof node === "boolean") return node ? "any" : "never";
  if (!isPlainRecord(node)) return "unknown";
  if (typeof node.$ref === "string") return node.$ref.replace(/^#\/\$defs\//, "");
  if (Array.isArray(node.enum)) return `enum(${node.enum.length})`;
  if (Array.isArray(node.type)) return node.type.join(" | ");
  if (node.type === "array") return `array<${summarizeType(node.items)}>`;
  if (typeof node.type === "string") return node.type;
  if (Array.isArray(node.oneOf)) return "oneOf";
  if (Array.isArray(node.anyOf)) return "anyOf";
  if (Array.isArray(node.allOf)) return "allOf";
  return "any";
}

/** Extracts flat parameter table rows for display inside tool cards. */
export function extractParamRows(schema: Record<string, unknown> | undefined): ParamTableRow[] {
  if (!schema || !isPlainRecord(schema) || !isPlainRecord(schema.properties)) return [];
  const requiredTop = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
  const rows: ParamTableRow[] = [];

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    if (
      REST_GROUPS.has(propName) &&
      isPlainRecord(propSchema) &&
      propSchema.type === "object" &&
      isPlainRecord(propSchema.properties)
    ) {
      const groupReq = new Set(Array.isArray(propSchema.required) ? propSchema.required.map(String) : []);
      for (const [childName, childSchema] of Object.entries(propSchema.properties)) {
        rows.push({
          group: propName,
          name: childName,
          type: summarizeType(childSchema),
          required: groupReq.has(childName),
          description:
            isPlainRecord(childSchema) && typeof childSchema.description === "string"
              ? childSchema.description
              : "",
        });
      }
      continue;
    }

    rows.push({
      group: propName === "body" ? "body" : "参数",
      name: propName,
      type: summarizeType(propSchema),
      required: requiredTop.has(propName),
      description:
        isPlainRecord(propSchema) && typeof propSchema.description === "string"
          ? propSchema.description
          : "",
    });
  }
  return rows;
}
