export function assertHeaderDeclarations(inputSchema: unknown) {
  const names = new Set<string>();
  const visit = (value: unknown, reachable: boolean, depth: number) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const node = value as Record<string, unknown>;
    if (Object.hasOwn(node, "x-mcp-header")) {
      const name = node["x-mcp-header"];
      if (!reachable || depth === 0 || typeof name !== "string" || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)
        || !["string", "integer", "boolean"].includes(String(node.type)) || names.has(name.toLowerCase())) {
        throw new Error("Invalid x-mcp-header declaration; discovery was not applied");
      }
      names.add(name.toLowerCase());
    }
    for (const [keyword, child] of Object.entries(node)) {
      if (["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"].includes(keyword) && child && typeof child === "object") {
        for (const schema of Object.values(child)) visit(schema, reachable && keyword === "properties", depth + 1);
      } else if (["allOf", "anyOf", "oneOf", "prefixItems", "items", "additionalItems", "additionalProperties", "propertyNames", "contains", "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems"].includes(keyword)) {
        for (const schema of Array.isArray(child) ? child : [child]) visit(schema, false, depth + 1);
      }
    }
  };
  visit(inputSchema, true, 0);
}
