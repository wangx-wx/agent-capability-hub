import { test, expect } from "@playwright/test";

test("administrator reviews editable REST imports and confirms only supported operations", async ({ page }, testInfo) => {
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: "接入服务", exact: true }).click();
  await page.getByRole("button", { name: "REST API", exact: true }).click();
  await page.getByRole("button", { name: "OpenAPI", exact: true }).click();
  const document = { openapi: "3.1.0", servers: [{ url: targets.rest }], paths: {
    "/read": { get: { operationId: "read", responses: { "200": { description: "Read" } } } },
    "/cookie": { get: { operationId: "cookie", parameters: [{ in: "cookie", name: "session", schema: { type: "string" } }], responses: { "200": { description: "Cookie" } } } },
  } };
  await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify(document));
  await page.getByRole("button", { name: "解析预览", exact: true }).click();
  await expect(page.getByLabel("选择 GET /cookie", { exact: true })).toBeDisabled();
  await page.getByLabel("导入服务名称", { exact: true }).fill("Browser REST");
  await page.getByLabel("导入命名空间", { exact: true }).fill("rest-browser");
  await page.getByLabel("导入后启用", { exact: true }).check();
  await page.getByLabel("选择 GET /read", { exact: true }).check();
  await page.getByLabel("操作定义 GET /read", { exact: true }).fill(JSON.stringify({ name: "read-edited", method: "GET", path: "/read", parameters: [], example: {} }, null, 2));
  await page.screenshot({ path: testInfo.outputPath("rest-import-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("导入完成");
  await expect(page.getByRole("heading", { name: "Browser REST", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "试调用 rest-browser__read-edited", exact: true }).click();
  await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  await expect(page.getByTestId("tool-result")).toContainText("accepted");
  await page.screenshot({ path: testInfo.outputPath("rest-console.png"), fullPage: true });
});
