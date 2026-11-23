"""Move unchanged account handlers out of app.ts after source relocation."""

from pathlib import Path

source = Path("apps/api/src")
app_path = source / "app.ts"
app = app_path.read_text()
session_start = app.index("const sessionDurationSeconds")
create_start = app.index("export function createApp")
auth_start = app.index('  app.post("/api/auth/login"')
roles_start = app.index('  app.get("/api/admin/roles"')
users_start = app.index('  app.get("/api/admin/users"')
health_start = app.index('  app.get("/api/health"')

session = app[session_start:create_start].rstrip()
for declaration in ["const sessionDurationSeconds", "const sessionCookieName", "type AuthenticatedUser",
                    "function hashSessionToken", "function readCookie", "async function getSessionUser"]:
    session = session.replace(declaration, "export " + declaration)
session = session.replace("express.Request", "Request")
(source / "modules/auth/session.ts").write_text('\n'.join([
    'import { createHash } from "node:crypto";',
    'import type { Request } from "express";',
    'import type { Kysely } from "kysely";',
    'import type { DatabaseSchema } from "../../database/schema.js";',
]) + "\n\n" + session + '\n\nexport type ResolveSessionUser = (request: Request) => Promise<AuthenticatedUser | null>;\n')

routes = [
    ("auth", "Auth", app[auth_start:roles_start], [
        'import { randomBytes } from "node:crypto";',
        'import { hashPassword, verifyPassword } from "./password.js";',
        'import { hashSessionToken, readCookie, sessionCookieName, sessionDurationSeconds, type ResolveSessionUser } from "./session.js";',
    ]),
    ("roles", "Role", app[roles_start:users_start], [
        'import { randomUUID } from "node:crypto";',
        'import type { ResolveSessionUser } from "../auth/session.js";',
    ]),
    ("users", "User", app[users_start:health_start], [
        'import { randomBytes, randomUUID } from "node:crypto";',
        'import { hashPassword } from "../auth/password.js";',
        'import type { ResolveSessionUser } from "../auth/session.js";',
    ]),
]
for module, name, body, imports in routes:
    path = source / "modules" / module / "routes.ts"
    path.parent.mkdir(parents=True, exist_ok=True)
    imports = [imports[0],
        'import type { Express } from "express";',
        'import type { Kysely } from "kysely";',
        'import type { DatabaseSchema } from "../../database/schema.js";',
    ] + imports[1:]
    body = body.replace("getSessionUser(database, request)", "resolveUser(request)")
    path.write_text("\n".join(imports) + f"\n\nexport function register{name}Routes(app: Express, database: Kysely<DatabaseSchema>, resolveUser: ResolveSessionUser) {{\n"
                    + body.rstrip() + "\n}\n")

prefix = app[:session_start]
prefix = prefix.replace('import { createHash, randomBytes, randomUUID } from "node:crypto";\n', "")
prefix = prefix.replace('import { hashPassword, verifyPassword } from "./modules/auth/password.js";\n', "")
prefix = prefix.rstrip() + "\n" + '\n'.join([
    'import { getSessionUser } from "./modules/auth/session.js";',
    'import { registerAuthRoutes } from "./modules/auth/routes.js";',
    'import { registerRoleRoutes } from "./modules/roles/routes.js";',
    'import { registerUserRoutes } from "./modules/users/routes.js";',
]) + "\n\n"
registration = '\n'.join([
    '  const resolveUser = (request: express.Request) => getSessionUser(database, request);',
    '  registerAuthRoutes(app, database, resolveUser);',
    '  registerRoleRoutes(app, database, resolveUser);',
    '  registerUserRoutes(app, database, resolveUser);',
]) + "\n\n"
suffix = app[health_start:].replace("(request) => getSessionUser(database, request)", "resolveUser")
app_path.write_text(prefix + app[create_start:auth_start] + registration + suffix)
print("Extracted auth, role and user routes; app.ts now composes modules.")
