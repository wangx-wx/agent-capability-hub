import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const chrome = process.env.PLAYWRIGHT_CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./test",
  outputDir: "../../dev-artifacts/mcp-browser-20261123/results",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5310", headless: true,
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}, viewport: { width: 1440, height: 1000 } },
  webServer: [
    { command: "pnpm --filter @ach/api exec tsx test/fixtures/browser-platform.ts", cwd: "../..", url: "http://127.0.0.1:3310/api/health", reuseExistingServer: false },
    { command: "pnpm exec vite --host 127.0.0.1 --port 5310 --strictPort", url: "http://127.0.0.1:5310", env: { ACH_API_TARGET: "http://127.0.0.1:3310" }, reuseExistingServer: false },
  ],
});
