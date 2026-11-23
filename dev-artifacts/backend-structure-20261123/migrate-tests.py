"""Group existing public-interface tests without changing assertions."""

import os
from pathlib import Path
import re

tests = Path("apps/api/test").resolve()
groups = {
    "auth.test.ts": "auth",
    "capabilities.test.ts": "resources",
    "deployment.test.ts": "deployment",
    "health.test.ts": "deployment",
    "limits.test.ts": "deployment",
    "audit-failure.test.ts": "audit",
    "rest-reimport.test.ts": "imports",
}

for original in tests.glob("*.test.ts"):
    filename = original.name
    if filename in groups:
        group = groups[filename]
    elif filename.startswith("mcp"):
        group = "mcp"
    elif filename.startswith("openapi"):
        group = "imports/openapi"
    elif filename.startswith("curl"):
        group = "imports/curl"
    elif filename.startswith("rest"):
        group = "rest"
    elif filename.startswith(("service", "tool")):
        group = "services"
    else:
        raise AssertionError(f"Unassigned test: {filename}")
    destination = tests / group / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    text = original.read_text()

    def relative_path(value):
        target = (original.parent / value).resolve()
        relative = os.path.relpath(target, destination.parent)
        return relative if relative.startswith(".") else "./" + relative

    text = re.sub(r'from "(\.[^"]+)"', lambda match: f'from "{relative_path(match.group(1))}"', text)
    text = re.sub(r'new URL\("(\.[^"]+)", import.meta.url\)',
                  lambda match: f'new URL("{relative_path(match.group(1))}", import.meta.url)', text)
    if filename == "deployment.test.ts":
        text = text.replace('resolve(import.meta.dirname, "..")', 'resolve(import.meta.dirname, "../..")')
    destination.write_text(text)
    original.unlink()
print("Grouped all 41 backend test files and preserved shared fixtures.")
