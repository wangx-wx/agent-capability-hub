import { expect, test } from "@playwright/test";

test("administrator can collapse and expand the desktop sidebar", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();

  const sidebar = page.locator("aside");
  await expect(sidebar).toHaveCSS("width", "232px");
  await page.getByRole("button", { name: "收起侧栏", exact: true }).click();
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(page.getByRole("button", { name: "收起侧栏", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "展开侧栏", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "MCP 服务", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("MCP 服务");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "72px");
  await page.getByRole("button", { name: "展开侧栏", exact: true }).click();
  await expect(sidebar).toHaveCSS("width", "232px");
});
