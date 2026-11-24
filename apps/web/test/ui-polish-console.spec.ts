import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../dev-artifacts/web-ui-polish-20261124",
);

async function settleAndCheckViewport(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter((anim) => anim.effect?.getComputedTiming().iterations !== Infinity)
        .map((anim) => anim.finished.catch(() => undefined)),
    );
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("v4 hash routing, guard dialogs, audit filters, tool alignment, and 4 viewports hold", async ({
  page,
}) => {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();

  // Seed MCP & REST services, long-description tool, role, user, and grants
  const mcpServiceRes = await (
    await page.request.post("/api/admin/services", {
      data: {
        name: "Polish MCP",
        namespace: "polish-mcp",
        kind: "mcp",
        url: targets.mcp,
        enabled: true,
        description: "MCP telemetry fixture service for UI polish checks",
      },
    })
  ).json();
  const mcpId = mcpServiceRes.service.id as string;
  const syncPreview = await (
    await page.request.post(`/api/admin/services/${mcpId}/sync-preview`)
  ).json();
  await page.request.post(`/api/admin/services/${mcpId}/sync-confirm`, {
    data: { previewId: syncPreview.preview.id },
  });
  const mcpTools = (
    await (await page.request.get(`/api/admin/services/${mcpId}/tools`)).json()
  ).tools as Array<{ id: string; name: string }>;
  const echoTool = mcpTools.find((t) => t.name === "polish-mcp__echo")!;

  const restServiceRes = await (
    await page.request.post("/api/admin/services", {
      data: {
        name: "Polish REST",
        namespace: "polish-rest",
        kind: "rest",
        url: targets.rest,
        enabled: true,
        description: "REST API service with long tool descriptions",
      },
    })
  ).json();
  const restId = restServiceRes.service.id as string;
  const shortToolResp = await page.request.post(`/api/admin/services/${restId}/tools`, {
    data: {
      name: "short-read",
      description: "读取短描述测试端点",
      method: "GET",
      path: "/read",
      parameters: [],
    },
  });
  expect(shortToolResp.ok()).toBe(true);
  const shortToolRes = await shortToolResp.json();
  const longToolResp = await page.request.post(`/api/admin/services/${restId}/tools`, {
    data: {
      name: "long-desc-tool",
      description:
        "这是一段故意构造的超长 REST 接口说明文案，用于验证服务详情抽屉内右侧「试调用」「编辑」「删除」动作按钮组在任何说明文本长度下都保持水平不换行且不错位对齐。".repeat(
          3,
        ),
      method: "GET",
      path: "/long-read",
      parameters: [
        { in: "query", name: "filter", required: false, schema: { type: "string" } },
      ],
    },
  });
  expect(longToolResp.ok()).toBe(true);

  const roleRes = await (
    await page.request.post("/api/admin/roles", { data: { name: "Polish Reader" } })
  ).json();
  const roleId = roleRes.role.id as string;
  await page.request.put(`/api/admin/roles/${roleId}/resources`, {
    data: { resourceIds: [echoTool.id, shortToolRes.tool.id] },
  });

  const userRes = await (
    await page.request.post("/api/admin/users", {
      data: { username: "polish-user", roleIds: [roleId] },
    })
  ).json();
  const userId = userRes.user.id as string;

  // 1. Hash routing + F5 reload persistence
  const nav = page.getByRole("navigation", { name: "主导航" });
  await nav.getByRole("button", { name: "角色与授权", exact: true }).click();
  await expect(page).toHaveURL(/#\/roles$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "角色与授权", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Polish Reader/ })).toBeVisible();

  await nav.getByRole("button", { name: "调用审计", exact: true }).click();
  await expect(page).toHaveURL(/#\/audit$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "调用审计", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "耗时", exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "用户", exact: true }).click();
  await expect(page).toHaveURL(/#\/users$/);
  const userRow = page.getByRole("row", { name: /polish-user/ });
  await userRow.getByRole("button", { name: "Keys", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/users/${userId}/keys$`));
  await page.reload();
  await expect(page.getByRole("heading", { name: "polish-user · API Keys", exact: true })).toBeVisible();

  // 2. CreateKeyModal initial validation + vertical custom date expansion without horizontal drift
  await page.getByRole("button", { name: "创建 Key", exact: true }).click();
  const createKeyDialog = page.getByRole("dialog", { name: "创建 API Key" });
  await expect(createKeyDialog).toBeVisible();
  await createKeyDialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const initialBox = (await createKeyDialog.boundingBox())!;
  await createKeyDialog.getByLabel("名称", { exact: true }).fill("Polish Active Key");
  await createKeyDialog.getByRole("button", { name: "创建 Key", exact: true }).click();
  await expect(createKeyDialog.getByRole("alert")).toContainText("请明确选择过期时间或永久有效");

  await createKeyDialog.getByRole("button", { name: "自定义日期", exact: true }).click();
  await expect(createKeyDialog.getByLabel("到期时间", { exact: true })).toBeVisible();
  const expandedBox = (await createKeyDialog.boundingBox())!;
  expect(Math.abs(expandedBox.x - initialBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(expandedBox.width - initialBox.width)).toBeLessThanOrEqual(2);
  expect(expandedBox.height).toBeGreaterThan(initialBox.height);

  await createKeyDialog.getByRole("button", { name: "30 天", exact: true }).click();
  await createKeyDialog.getByRole("button", { name: "创建 Key", exact: true }).click();
  const apiKeyValue = (await page.getByRole("dialog").locator("code").textContent())!.trim();
  await page.getByRole("button", { name: "完成", exact: true }).click();

  // Seed succeeded & failed formal /mcp invocations for Audit checks
  const mcpHeaders = {
    Authorization: `Bearer ${apiKeyValue}`,
    Accept: "application/json, text/event-stream",
  };
  await page.request.post("/mcp", {
    headers: mcpHeaders,
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "polish-mcp__echo", arguments: { text: "audit duration ok" } },
    },
  });
  await page.request.post("/mcp", {
    headers: mcpHeaders,
    data: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "polish-mcp__count", arguments: {} },
    },
  });

  // 3. ConfirmDialog for revoking an API Key
  await page.getByRole("button", { name: "创建 Key", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("Polish Revoke Key");
  await page.getByRole("dialog", { name: "创建 API Key" }).getByRole("button", { name: "永久", exact: true }).click();
  await page.getByRole("dialog", { name: "创建 API Key" }).getByRole("button", { name: "创建 Key", exact: true }).click();
  await page.getByRole("button", { name: "完成", exact: true }).click();

  const revokeRow = page.getByRole("row", { name: /Polish Revoke Key/ });
  await revokeRow.getByRole("button", { name: "吊销", exact: true }).click();
  const revokeConfirm = page.getByRole("dialog", { name: "吊销 API Key" });
  await expect(revokeConfirm).toBeVisible();
  await revokeConfirm.getByRole("button", { name: "确认吊销", exact: true }).click();
  await expect(revokeRow).toContainText("已吊销");

  // 4. SecretDialog(kind="password") backdrop protection + ConfirmDialog user disable
  await page.getByRole("button", { name: "返回用户列表", exact: true }).click();
  const rowAgain = page.getByRole("row", { name: /polish-user/ });
  await rowAgain.getByRole("button", { name: "重置密码", exact: true }).click();
  await page.getByRole("dialog", { name: "重置用户密码" }).getByRole("button", { name: "确认重置", exact: true }).click();

  const passwordDialog = page.getByRole("dialog", { name: /用户 polish-user 的新密码/ });
  await expect(passwordDialog.getByRole("alert")).toContainText("明文展示一次");
  await page.mouse.click(12, 12);
  await expect(passwordDialog).toBeVisible();
  await passwordDialog.getByRole("button", { name: "完成", exact: true }).click();

  await rowAgain.getByRole("button", { name: "停用", exact: true }).click();
  const disableConfirm = page.getByRole("dialog", { name: "停用用户" });
  await expect(disableConfirm).toBeVisible();
  await disableConfirm.getByRole("button", { name: "确认停用", exact: true }).click();
  await expect(rowAgain).toContainText("停用");

  // 5. Long-description tool row horizontal button alignment
  await page.setViewportSize({ width: 1280, height: 800 });
  await nav.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: "Polish REST", exact: true }).click();
  const restDrawer = page.getByRole("dialog", { name: "Polish REST" });
  await expect(restDrawer).toBeVisible();

  const btnTest = restDrawer.getByRole("button", { name: "试调用 polish-rest__long-desc-tool", exact: true });
  const btnEdit = restDrawer.getByRole("button", { name: "编辑 polish-rest__long-desc-tool", exact: true });
  const boxTestBefore = (await btnTest.boundingBox())!;
  const boxEditBefore = (await btnEdit.boundingBox())!;
  expect(Math.abs(boxTestBefore.y - boxEditBefore.y)).toBeLessThanOrEqual(2);
  expect(boxTestBefore.height).toBeLessThanOrEqual(36);

  await restDrawer.getByRole("button", { name: "展开", exact: true }).first().click();
  const boxTestAfter = (await btnTest.boundingBox())!;
  const boxEditAfter = (await btnEdit.boundingBox())!;
  expect(Math.abs(boxTestAfter.y - boxEditAfter.y)).toBeLessThanOrEqual(2);
  await restDrawer.getByRole("button", { name: "关闭", exact: true }).click();

  // 6. Audit server-side status & q filters + durationMs column + 1280 screenshots
  await nav.getByRole("button", { name: "调用审计", exact: true }).click();
  await expect(page.getByRole("cell", { name: /polish-mcp__echo/ }).first()).toBeVisible();
  await expect(page.getByText(/\d+\s*ms/).first()).toBeVisible();

  await page.getByPlaceholder("搜索用户、服务、工具或客户端…").fill("polish-mcp__");
  await expect(page.getByRole("cell", { name: /polish-mcp__echo/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: /polish-mcp__count/ }).first()).toBeVisible();

  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "desktop-1280-audit.png"), fullPage: true });

  await page.getByRole("combobox", { name: "按调用状态筛选", exact: true }).click();
  await page.getByRole("option", { name: "失败", exact: true }).click();
  await expect(page.getByRole("cell", { name: /polish-mcp__count/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: /polish-mcp__echo/ })).toHaveCount(0);

  // 7. Capture remaining 4-viewport screenshots
  await page.setViewportSize({ width: 1280, height: 800 });
  await nav.getByRole("button", { name: "概览", exact: true }).click();
  await expect(page.getByRole("heading", { name: "欢迎，browser-admin" })).toBeVisible();
  await expect(page.getByTestId("usage-total")).toBeVisible();
  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "desktop-1280-overview.png"), fullPage: true });

  await nav.getByRole("button", { name: "角色与授权", exact: true }).click();
  await page.getByRole("button", { name: /Polish Reader/ }).click();
  await expect(page.getByText(/目录自动可见/).first()).toBeVisible();
  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "desktop-1280-roles.png"), fullPage: true });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await nav.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await expect(page.getByRole("button", { name: "Polish REST", exact: true })).toBeVisible();
  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "desktop-1920-services.png"), fullPage: true });

  await page.setViewportSize({ width: 900, height: 760 });
  await nav.getByRole("button", { name: "角色与授权", exact: true }).click();
  await expect(page.getByRole("button", { name: /Polish Reader/ })).toBeVisible();
  await page.getByRole("button", { name: /Polish Reader/ }).click();
  await expect(page.getByText(/目录自动可见/).first()).toBeVisible();
  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "tablet-900-roles.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开导航", exact: true }).click();
  await page.getByRole("dialog", { name: "工作区导航" }).getByRole("button", { name: "MCP 服务", exact: true }).click();
  await expect(page.getByRole("button", { name: "Polish REST", exact: true })).toBeVisible();
  await settleAndCheckViewport(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "mobile-390-services.png"), fullPage: true });

  await page.getByRole("button", { name: "Polish REST", exact: true }).click();
  const mobileDrawer = page.getByRole("dialog", { name: "Polish REST" });
  await expect(mobileDrawer).toBeVisible();
  await expect(page.getByRole("button", { name: "试调用 polish-rest__long-desc-tool", exact: true })).toBeVisible();
  await settleAndCheckViewport(page);
  const mobileDrawerBox = (await mobileDrawer.boundingBox())!;
  expect(mobileDrawerBox.x).toBeGreaterThanOrEqual(0);
  expect(mobileDrawerBox.x + mobileDrawerBox.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "mobile-390-drawer.png") });
});
