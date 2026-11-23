import { afterEach, expect, it, vi } from "vitest";
import { startPlatform } from "../../fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;
afterEach(async () => { await platform?.close(); platform = undefined; vi.unstubAllEnvs(); });

it("rejects shell expansion, local files and repeated scalar headers without publishing", async () => {
  platform = await startPlatform();
  vi.stubEnv("CURL_IMPORT_LOCAL_VALUE", "local-secret-must-not-be-read");
  for (const text of [
    "curl $(printf substituted) 'http://127.0.0.1:1/tools'",
    'curl "http://127.0.0.1:1/tools" -H "Authorization: Bearer $CURL_IMPORT_LOCAL_VALUE"',
    "curl 'http://127.0.0.1:1/tools' --data @/etc/passwd",
    "curl 'http://127.0.0.1:1/tools' | cat",
    "curl 'http://127.0.0.1:1/tools' --config /etc/passwd",
    "curl 'http://127.0.0.1:1/tools' -H 'X-Tenant: first' -H 'x-tenant: second'",
  ]) {
    const response = await platform.admin.post("/api/admin/imports/preview").send({ kind: "curl", text }).expect(400);
    expect(JSON.stringify(response.body)).not.toContain("local-secret-must-not-be-read");
  }
  expect((await platform.admin.get("/api/admin/services").expect(200)).body.services).toEqual([]);
});
