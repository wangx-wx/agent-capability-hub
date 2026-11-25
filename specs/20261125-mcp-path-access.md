# MCP Path Access

## Decision

Each registered MCP service is available at `/{namespace}/mcp` on the current platform origin. The namespace is unique and managed by administrators. Changing it immediately changes the URL; the old path is not retained or redirected.

The unified `/mcp` endpoint remains available. Its existing global tool catalog and per-tool authorization behavior do not change. A namespace endpoint exposes only tools belonging to that MCP service. Administrators can see every available tool for the selected service. Other users can see and call only tools granted to any of their roles. A service-level resource grant makes the service visible in the console, but does not grant its tools.

Non-administrators can open the MCP Services and Call Audit views. Their service catalog contains only enabled or disabled MCP services granted directly or through at least one granted tool, and only granted tools are displayed. The catalog is read-only and does not expose upstream credentials or upstream URLs; the displayed endpoint is the current platform origin plus `/{namespace}/mcp`. Audit queries for non-administrators always filter by the authenticated user, regardless of query parameters. Administrators retain the full service management and audit views.

## Verification Boundaries

- MCP HTTP integration tests verify service scoping for administrator and user tool listing/calls, authorization boundaries, and namespace rename invalidating the previous path.
- Session API tests verify the user service catalog/tool list, read-only mutations, and self-only audit filtering.
- Browser tests verify non-administrator navigation, read-only service details, and personal audit visibility.
