import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadProjectEnv() {
  const envPath = resolve(import.meta.dirname, "../../../../.env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}
