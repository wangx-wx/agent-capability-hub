"""One-time source relocation from main a0884d3; run from the worktree root."""

import json
import os
from pathlib import Path
import re

root = Path.cwd()
source = root / "apps/api/src"
mapping = {
    "api-keys.ts": "modules/api-keys/routes.ts",
    "audit-attempt.ts": "modules/audit/attempt.ts",
    "audit-migration.ts": "database/migrations/004-audit.ts",
    "bounded-fetch.ts": "shared/http/bounded-fetch.ts",
    "credentials.ts": "modules/services/credentials.ts",
    "curl-import.ts": "modules/imports/curl/parser.ts",
    "curl-tokens.ts": "modules/imports/curl/tokens.ts",
    "env.ts": "config/env.ts",
    "http-body.ts": "shared/http/body.ts",
    "import-confirm.ts": "modules/imports/confirm.ts",
    "import-input.ts": "modules/imports/input.ts",
    "import-targets.ts": "modules/imports/targets.ts",
    "import-types.ts": "modules/imports/types.ts",
    "imports.ts": "modules/imports/routes.ts",
    "key-auth.ts": "modules/auth/key-auth.ts",
    "limits.ts": "config/limits.ts",
    "mcp-sources.ts": "modules/mcp/sources.ts",
    "mcp-sync.ts": "modules/mcp/sync.ts",
    "mcp-tool-schema.ts": "modules/mcp/tool-schema.ts",
    "mcp.ts": "modules/mcp/gateway.ts",
    "openapi-import.ts": "modules/imports/openapi/parser.ts",
    "openapi-schema.ts": "modules/imports/openapi/schema.ts",
    "password.ts": "modules/auth/password.ts",
    "reset-admin-password.ts": "scripts/reset-admin-password.ts",
    "resources.ts": "modules/resources/routes.ts",
    "rest-definition.ts": "modules/rest/definition.ts",
    "rest-execution.ts": "modules/rest/execution.ts",
    "rest-parameters.ts": "modules/rest/parameters.ts",
    "rest-tools.ts": "modules/rest/tools.ts",
    "service-edit.ts": "modules/services/edit.ts",
    "service-migration.ts": "database/migrations/002-services.ts",
    "services.ts": "modules/services/routes.ts",
    "tool-catalog.ts": "modules/tools/catalog.ts",
    "tool-edit.ts": "modules/tools/edit.ts",
    "tool-execution.ts": "modules/tools/execution.ts",
    "tool-migration.ts": "database/migrations/003-tools.ts",
    "tool-name-migration.ts": "database/migrations/005-tool-names.ts",
    "tool-test.ts": "modules/tools/test.ts",
    "audit.ts": "modules/audit/routes.ts",
}
table_files = ["service-schema.ts", "tool-schema.ts", "audit-schema.ts"]
for filename in table_files:
    mapping[filename] = "database/schema.ts"
mapping.update({"app.ts": "app.ts", "index.ts": "index.ts"})
assert set(mapping) | {"database.ts"} == {path.name for path in source.glob("*.ts")}

database = (source / "database.ts").read_text()
schema_start = database.index("interface UserTable")
initial_start = database.index("const initialMigration")
initialize_start = database.index("const migrationProvider")
client_start = database.index("export function createDatabase")
database_outputs = {
    "database/schema.ts": database[schema_start:initial_start].rstrip() + "\n\n"
    + "\n".join((source / filename).read_text() for filename in table_files),
    "database/migrations/001-initial.ts": 'import type { Migration } from "kysely";\n\n'
    + database[initial_start:initialize_start].replace("const initialMigration", "export const initialMigration").rstrip() + "\n",
    "database/initialize.ts": '\n'.join([
        'import { randomUUID } from "node:crypto";',
        'import { Migrator, type Kysely, type MigrationProvider } from "kysely";',
        'import { hashPassword } from "../modules/auth/password.js";',
        'import type { DatabaseSchema } from "./schema.js";',
        'import { initialMigration } from "./migrations/001-initial.js";',
        'import { serviceMigration } from "./migrations/002-services.js";',
        'import { toolMigration } from "./migrations/003-tools.js";',
        'import { auditMigration } from "./migrations/004-audit.js";',
        'import { toolNameMigration } from "./migrations/005-tool-names.js";',
    ]) + "\n\n" + database[initialize_start:client_start].rstrip() + "\n",
    "database/client.ts": '\n'.join([
        'import { mkdirSync } from "node:fs";',
        'import { dirname, resolve } from "node:path";',
        'import Sqlite from "better-sqlite3";',
        'import { Kysely, SqliteDialect } from "kysely";',
        'import type { DatabaseSchema } from "./schema.js";',
    ]) + "\n\n" + database[client_start:],
}
destinations = {source / old: source / new for old, new in mapping.items()}
database_symbols = {
    "DatabaseSchema": "database/schema.ts",
    "InitialAdminCredentials": "database/initialize.ts",
    "initializeDatabase": "database/initialize.ts",
    "createDatabase": "database/client.ts",
}


def relative_import(target, destination):
    value = os.path.relpath(target.with_suffix(".js"), destination.parent)
    return value if value.startswith(".") else "./" + value


originals = {path: path.read_text() for path in list(source.glob("*.ts"))
             + list((root / "apps/api/test").rglob("*.ts"))}
for original, text in originals.items():
    if original.name in table_files or original == source / "database.ts":
        continue
    destination = destinations.get(original, original)
    # Rewrite only relative module specifiers; runtime paths remain explicit below.
    def update(match):
        kind = match.group(1) or ""
        names, specifier = match.group(2), match.group(3)
        if not specifier.startswith("."):
            return match.group(0)
        target = (original.parent / specifier).resolve().with_suffix(".ts")
        if target == source / "database.ts":
            lines = []
            for name in names.split(","):
                name = name.strip()
                is_type = kind == "type " or name.startswith("type ")
                symbol = name.removeprefix("type ")
                lines.append(f'import {"type " if is_type else ""}{{ {symbol} }} from "{relative_import(source / database_symbols[symbol], destination)}";')
            return "\n".join(lines)
        if target in destinations:
            return f'import {kind}{{{names}}} from "{relative_import(destinations[target], destination)}";'
        return match.group(0)
    text = re.sub(r'import (type )?\{([^}]+)\} from "([^"]+)";', update, text)
    if original.name == "env.ts":
        text = text.replace('"../../../.env"', '"../../../../.env"')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text)
    if destination != original:
        original.unlink()

for filename in table_files + ["database.ts"]:
    (source / filename).unlink()
for filename, text in database_outputs.items():
    destination = source / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text)

package_path = root / "apps/api/package.json"
package = json.loads(package_path.read_text())
package["scripts"]["admin:reset-password"] = "tsx src/scripts/reset-admin-password.ts"
package_path.write_text(json.dumps(package, indent=2) + "\n")
print(f"Relocated {len(mapping) - 2} source files; separated database responsibilities.")
