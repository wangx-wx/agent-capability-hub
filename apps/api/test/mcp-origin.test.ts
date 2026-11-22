import { afterEach, expect, it } from "vitest";
import { startPlatform } from "./fixtures/platform.js";

let platform: Awaited<ReturnType<typeof startPlatform>> | undefined;

afterEach(async () => {
  await platform?.close();
  platform = undefined;
});

it("rejects a browser origin outside the deployment's configured origins", async () => {
  platform = await startPlatform();
  const response = await fetch(platform.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${platform.token}`, Origin: "https://unapproved.example", "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(response.status).toBe(403);
});
