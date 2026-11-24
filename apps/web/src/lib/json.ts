export type JsonParseResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Parses a JSON string and returns a contextual Chinese error on syntax failure. */
export function parseJsonValue<T = unknown>(text: string, label: string): JsonParseResult<T> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: `${label}不能为空` };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as T };
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "语法错误";
    return { ok: false, error: `${label}不是有效的 JSON 格式（${detail}）` };
  }
}

/** Parses a JSON object (non-null, non-array), returning a Chinese error otherwise. */
export function parseJsonObject(
  text: string,
  label: string,
): JsonParseResult<Record<string, unknown>> {
  const parsed = parseJsonValue(text, label);
  if (!parsed.ok) return parsed;
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return { ok: false, error: `${label}必须为 JSON 对象（例如 {}）` };
  }
  return { ok: true, value: parsed.value as Record<string, unknown> };
}
