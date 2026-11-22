export interface GatewayLimits {
  importBytes: number;
  requestBytes: number;
  responseBytes: number;
  schemaDepth: number;
  schemaNodes: number;
}

export function gatewayLimits(overrides: Partial<GatewayLimits> = {}): GatewayLimits {
  const result = {
    importBytes: Number(process.env.MCP_MAX_IMPORT_BYTES ?? 10 * 1024 * 1024),
    requestBytes: Number(process.env.MCP_MAX_REQUEST_BYTES ?? 10 * 1024 * 1024),
    responseBytes: Number(process.env.MCP_MAX_RESPONSE_BYTES ?? 10 * 1024 * 1024),
    schemaDepth: Number(process.env.MCP_MAX_SCHEMA_DEPTH ?? 64),
    schemaNodes: Number(process.env.MCP_MAX_SCHEMA_NODES ?? 100_000),
    ...overrides,
  };
  for (const [name, value] of Object.entries(result)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  }
  return result;
}

export function assertSchemaBudget(schema: unknown, limits: GatewayLimits) {
  const pending = [{ value: schema, depth: 1 }];
  let nodes = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++nodes > limits.schemaNodes) throw new Error("Schema exceeds the configured node budget");
    if (depth > limits.schemaDepth) throw new Error("Schema exceeds the configured depth budget");
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) pending.push({ value: child, depth: depth + 1 });
    }
  }
}
