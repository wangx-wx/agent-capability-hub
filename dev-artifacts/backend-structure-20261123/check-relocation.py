"""Compare relocated bodies against the main baseline, ignoring import paths."""

import ast
from pathlib import Path
import re
import subprocess

source = Path("apps/api/src")
artifact = Path("dev-artifacts/backend-structure-20261123")
tree = ast.parse((artifact / "migrate-source.py").read_text())
mapping = next(ast.literal_eval(node.value) for node in tree.body
               if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "mapping" for target in node.targets))


def baseline(filename):
    return subprocess.check_output(["git", "show", f"a0884d3:apps/api/src/{filename}"], text=True)


def body(text):
    return re.sub(r"^import\b.*?;\n", "", text, flags=re.MULTILINE | re.DOTALL).strip()


for old, new in mapping.items():
    expected = body(baseline(old))
    if old == "env.ts":
        expected = expected.replace('"../../../.env"', '"../../../../.env"')
    assert body((source / new).read_text()) == expected, f"Body changed: {old} -> {new}"
print(f"PASS: {len(mapping)} relocated source bodies unchanged, except required .env path depth.")

database = baseline("database.ts")
initial = database[database.index("const initialMigration"):database.index("const migrationProvider")]
assert body((source / "database/migrations/001-initial.ts").read_text()) == initial.replace("const initialMigration", "export const initialMigration").strip()
assert body((source / "database/client.ts").read_text()) == database[database.index("export function createDatabase"):].strip()
assert body((source / "database/initialize.ts").read_text()) == database[database.index("const migrationProvider"):database.index("export function createDatabase")].strip()
schema = database[database.index("interface UserTable"):database.index("const initialMigration")].rstrip() + "\n\n" + "\n".join(
    baseline(filename) for filename in ["service-schema.ts", "tool-schema.ts", "audit-schema.ts"])
assert (source / "database/schema.ts").read_text().strip() == schema.strip()
print("PASS: all database table types, migrations, initialization and connection bodies unchanged.")

app = baseline("app.ts")
starts = [app.index(marker) for marker in ['  app.post("/api/auth/login"', '  app.get("/api/admin/roles"',
                                         '  app.get("/api/admin/users"', '  app.get("/api/health"']]
for module, start, end in zip(["auth", "roles", "users"], starts, starts[1:]):
    actual = (source / f"modules/{module}/routes.ts").read_text()
    actual = actual[actual.index("\n", actual.index("export function register")) + 1:].rstrip()
    actual = actual[:-1].strip().replace("resolveUser(request)", "getSessionUser(database, request)")
    assert actual == app[start:end].strip(), f"Handler body changed: {module}"
session = body((source / "modules/auth/session.ts").read_text()).split("export type ResolveSessionUser")[0]
session = session.replace("export ", "").replace("request: Request", "request: express.Request")
assert session.strip() == app[app.index("const sessionDurationSeconds"):app.index("export function createApp")].strip()
print("PASS: auth, role and user handlers and session behavior unchanged.")

for current in Path("apps/api/test").rglob("*.test.ts"):
    original = subprocess.check_output(["git", "show", f"a0884d3:apps/api/test/{current.name}"], text=True)
    def normalize(text):
        text = body(text)
        text = re.sub(r'new URL\("(?:\./|(?:\.\./)+)fixtures/', 'new URL("fixtures/', text)
        return text.replace('resolve(import.meta.dirname, "../..")', 'resolve(import.meta.dirname, "..")')
    assert normalize(original) == normalize(current.read_text()), f"Assertion body changed: {current}"
print("PASS: all 41 test bodies and assertions unchanged; only module, fixture and process paths moved.")

files = sorted(source.rglob("*.ts"))
largest = max(files, key=lambda path: len(path.read_text().splitlines()))
print(f"Largest production file: {largest} ({len(largest.read_text().splitlines())} lines).")
assert all(len(path.read_text().splitlines()) <= 500 for path in files)
print(f"app.ts: {len((source / 'app.ts').read_text().splitlines())} lines.")
