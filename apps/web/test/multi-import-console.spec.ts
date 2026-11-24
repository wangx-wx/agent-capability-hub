import { test, expect } from "@playwright/test";

test("administrator can inspect and call each service created by a multi-target import", async ({ page }, testInfo) => {
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: "接入服务", exact: true }).click();
  await page.getByRole("button", { name: "REST API", exact: true }).click();
  await page.getByRole("button", { name: "OpenAPI", exact: true }).click();
  await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify({ openapi: "3.1.0", paths: {
    "/read-one": { get: { operationId: "read-one", servers: [{ url: `${targets.rest}/first` }] } },
    "/read-two": { get: { operationId: "read-two", servers: [{ url: `${targets.rest}/second` }] } },
  } }));
  await page.getByRole("button", { name: "解析预览", exact: true }).click();
  const first = page.getByRole("region", { name: "目标服务 1", exact: true });
  const second = page.getByRole("region", { name: "目标服务 2", exact: true });
  await first.getByLabel("导入服务名称", { exact: true }).fill("Multi First");
  await first.getByLabel("导入命名空间", { exact: true }).fill("multi-first");
  await first.getByLabel("导入后启用", { exact: true }).check();
  await first.getByLabel("选择 GET /read-one", { exact: true }).check();
  await second.getByLabel("导入服务名称", { exact: true }).fill("Multi Second");
  await second.getByLabel("导入命名空间", { exact: true }).fill("multi-second");
  await second.getByLabel("导入后启用", { exact: true }).check();
  await second.getByLabel("选择 GET /read-two", { exact: true }).check();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByText(/共保存 2 个服务/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Multi First", exact: true })).toBeVisible();
  await page.getByRole("dialog", { name: "Multi First" }).getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "共保存 2 个服务" })).toBeVisible();
  await page.getByRole("button", { name: "查看 Multi Second", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Multi Second", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "试调用 multi-second__read-two", exact: true }).click();
  await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  await expect(page.getByTestId("tool-result")).toContainText("accepted");
  await page.screenshot({ path: testInfo.outputPath("multi-import-result.png"), fullPage: true });
  await page.getByRole("dialog", { name: "试调用：multi-second__read-two" }).getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog", { name: "Multi Second" }).getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "查看 Multi First", exact: true }).click();
  await expect(page.getByRole("button", { name: "试调用 multi-first__read-one", exact: true })).toBeVisible();
});
