import { test, expect } from "@playwright/test";

test("administrator manages native MCP and manual REST tools through one service menu", async ({ page }, testInfo) => {
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("button", { name: "MCP 服务", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "REST 导入", exact: true })).toHaveCount(0);
  await navigation.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: "接入服务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "选择接入方式", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("connection-choice.png"), fullPage: true });
  await page.getByRole("button", { name: "原生 MCP", exact: true }).click();
  await page.getByLabel("服务名称", { exact: true }).fill("Unified Native");
  await page.getByLabel("服务地址", { exact: true }).fill(targets.mcp);
  await page.getByLabel("命名空间", { exact: true }).fill("unified-native");
  await page.getByLabel("启用服务", { exact: true }).check();
  await page.getByRole("button", { name: "保存服务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Unified Native", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "同步工具", exact: true }).click();
  await page.getByRole("button", { name: "确认同步", exact: true }).click();
  await expect(page.getByRole("button", { name: "试调用 unified-native__echo", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "接入服务", exact: true }).click();
  await page.getByRole("button", { name: "REST API", exact: true }).click();
  await page.getByRole("button", { name: "手工定义", exact: true }).click();
  await page.getByLabel("服务名称", { exact: true }).fill("Unified REST");
  await page.getByLabel("服务地址", { exact: true }).fill(targets.rest);
  await page.getByLabel("命名空间", { exact: true }).fill("unified-rest");
  await page.getByLabel("启用服务", { exact: true }).check();
  await page.getByRole("button", { name: "保存服务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Unified REST", exact: true })).toBeVisible();
  await expect(page.getByText("配置有效", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "同步工具", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "定义 REST 工具", exact: true }).click();
  await page.getByLabel("REST 工具定义", { exact: true }).fill(JSON.stringify({
    name: "read", method: "GET", path: "/read", parameters: [], example: {},
  }));
  await page.getByRole("button", { name: "保存工具", exact: true }).click();
  await page.getByRole("button", { name: "试调用 unified-rest__read", exact: true }).click();
  await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  await expect(page.getByTestId("tool-result")).toContainText("accepted");
  await expect(page.getByRole("navigation", { name: "已登记服务" }).getByRole("button", { name: /^Unified Native/ })).toContainText("原生 MCP");
  await expect(page.getByRole("navigation", { name: "已登记服务" }).getByRole("button", { name: /^Unified REST/ })).toContainText("REST API");
  await page.screenshot({ path: testInfo.outputPath("unified-services.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Unified REST", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("unified-services-mobile.png") });
});
