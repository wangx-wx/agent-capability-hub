// Verify the compiled server and relocated password-reset command on a disposable database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const api = fileURLToPath(new URL("../../apps/api/", import.meta.url));
const databasePath = fileURLToPath(new URL("./smoke.sqlite", import.meta.url));
const probe = createServer().listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
const env = { ...process.env, NODE_ENV: "test", DATABASE_PATH: databasePath,
  ADMIN_USERNAME: "structure-smoke", ADMIN_PASSWORD: "structure-smoke-initial-password",
  API_HOST: "127.0.0.1", API_PORT: String(port) };
const baseURL = `http://127.0.0.1:${port}`;

async function run(args) {
  const child = spawn("pnpm", args, { cwd: api, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (data) => { stdout += data; });
  child.stderr.on("data", (data) => { stderr += data; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, stderr);
  return stdout;
}

const server = spawn("pnpm", ["start"], { cwd: api, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
let stderr = "";
server.stderr.on("data", (data) => { stderr += data; });
const startupTimeout = setTimeout(() => process.kill(-server.pid, "SIGTERM"), 15000);
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => { if (data.toString().includes("API listening")) resolve(); });
    server.once("error", reject);
    server.once("exit", () => reject(new Error(`Server exited before startup: ${stderr}`)));
  });
  clearTimeout(startupTimeout);
  const health = await fetch(`${baseURL}/api/health`);
  assert.deepEqual(await health.json(), { status: "ok", database: "ok" });
  const login = (password) => fetch(`${baseURL}/api/auth/login`, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: env.ADMIN_USERNAME, password }) });
  const originalLogin = await login(env.ADMIN_PASSWORD);
  assert.equal(originalLogin.status, 200);
  const cookie = originalLogin.headers.get("set-cookie").split(";")[0];
  const reset = await run(["admin:reset-password"]);
  const password = reset.match(/New password: (\S+)/)?.[1];
  assert.ok(password, "Password-reset command must emit the replacement password");
  const session = await fetch(`${baseURL}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal(session.status, 401);
  assert.equal((await login(env.ADMIN_PASSWORD)).status, 401);
  assert.equal((await login(password)).status, 200);
  console.log("PASS: pnpm start serves the compiled API and initializes the database.");
  console.log("PASS: pnpm admin:reset-password runs the relocated script, replaces the password and revokes sessions.");
} finally {
  clearTimeout(startupTimeout);
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    process.kill(-server.pid, "SIGTERM");
    await exited;
  }
  for (const suffix of ["", "-wal", "-shm"]) await rm(databasePath + suffix, { force: true });
}
