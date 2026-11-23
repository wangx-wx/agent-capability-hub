import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

let child: ChildProcess | undefined;
afterEach(async () => { if (child && child.exitCode === null) { const closed = once(child, "exit"); child.kill("SIGTERM"); await closed; } child = undefined; });

it("binds the production API to the deployment-configured host", async () => {
  const probe = createServer().listen(0, "::1");
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  await new Promise<void>((done) => probe.close(() => done()));
  child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: resolve(import.meta.dirname, "../.."),
    env: { ...process.env, DATABASE_PATH: ":memory:", ADMIN_USERNAME: "deployment-admin", ADMIN_PASSWORD: "deployment-test-password", API_HOST: "::1", API_PORT: String(address.port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((done, reject) => {
    child!.stdout!.on("data", (data: Buffer) => { if (data.toString().includes("API listening")) done(); });
    child!.once("error", reject);
    child!.once("exit", () => reject(new Error("API exited before listening")));
  });
  const response = await fetch(`http://[::1]:${address.port}/api/health`);
  expect(await response.json()).toEqual({ status: "ok", database: "ok" });
});
