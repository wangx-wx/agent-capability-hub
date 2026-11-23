import { test, expect } from "@playwright/test";

test("administrator registers and confirms MCP tools through the console", async ({ page }, testInfo) => {
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: "接入服务", exact: true }).click();
  await page.getByRole("button", { name: "原生 MCP", exact: true }).click();
  await page.getByLabel("服务名称", { exact: true }).fill("Browser Docs");
  await page.getByLabel("服务地址", { exact: true }).fill(targets.mcp);
  await page.getByLabel("命名空间", { exact: true }).fill("browser");
  await page.getByLabel("启用服务", { exact: true }).check();
  await page.getByRole("button", { name: "保存服务", exact: true }).click();
  await page.getByRole("button", { name: /^Browser Docs/ }).click();
  await page.getByRole("button", { name: "同步工具", exact: true }).click();
  await expect(page.getByRole("heading", { name: "同步差异", exact: true })).toBeVisible();
  await expect(page.getByText("browser__echo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "确认同步", exact: true }).click();
  await page.getByRole("button", { name: "试调用 browser__echo", exact: true }).click();
  await page.getByLabel("试调用参数", { exact: true }).fill('{"text":"browser hello"}');
  await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  await expect(page.getByTestId("tool-result")).toContainText("browser hello");
  await expect((await (await page.request.get("/api/usage")).json()).total).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("mcp-console.png"), fullPage: true });
});
