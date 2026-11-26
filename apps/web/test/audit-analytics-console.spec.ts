import { test, expect } from "@playwright/test";

test("audit queries update full-result metrics and trends independently of pagination", async ({ page, request }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "调用审计", exact: true })).toBeVisible();
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  const service = (await (await page.request.post("/api/admin/services", { data: {
    name: "Audit Chart", namespace: "audit-chart", kind: "mcp", url: targets.mcp, enabled: true,
  } })).json()).service;
  const preview = (await (await page.request.post(`/api/admin/services/${service.id}/sync-preview`)).json()).preview;
  const tools = (await (await page.request.post(`/api/admin/services/${service.id}/sync-confirm`, { data: { previewId: preview.id } })).json()).tools as Array<{ id: string; originalName: string }>;
  const role = (await (await page.request.post("/api/admin/roles", { data: { name: "Audit Chart Caller" } })).json()).role;
  await page.request.put(`/api/admin/roles/${role.id}/resources`, { data: { resourceIds: [tools.find((tool) => tool.originalName === "echo")!.id] } });
  const created = await (await page.request.post("/api/admin/users", { data: { username: "audit-chart-user", roleIds: [role.id] } })).json();
  await request.post("/api/auth/login", { data: { username: "audit-chart-user", password: created.initialPassword } });
  const key = (await (await request.post("/api/keys", { data: { name: "Audit Chart", expiresAt: null } })).json()).key.value;
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json, text/event-stream" };
  for (let id = 1; id <= 22; id++) {
    const response = await page.request.post("/mcp", { headers, data: {
      jsonrpc: "2.0", id, method: "tools/call", params: {
        name: id === 22 ? "audit-chart__missing" : "audit-chart__echo", arguments: { text: "chart" },
      },
    } });
    expect(response.ok()).toBe(true);
  }
  await page.getByRole("button", { name: "调用审计", exact: true }).click();
  await page.getByLabel("工具名称", { exact: true }).fill("audit-chart__");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toHaveText("22");
  await expect(page.getByTestId("audit-failed")).toHaveText("1");
  await expect(page.getByTestId("audit-success-rate")).toHaveText("95.5%");
  await expect(page.getByTestId("audit-average-duration")).not.toHaveText("—");
  await expect(page.getByRole("group", { name: "调用量趋势折线图", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("audit-desktop.png"), fullPage: true });
  await page.getByRole("combobox", { name: "每页显示条数", exact: true }).click();
  await page.getByRole("option", { name: "每页 20 条", exact: true }).click();
  await expect(page.getByRole("table", { name: "审计记录", exact: true }).getByRole("row")).toHaveCount(21);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.getByRole("table", { name: "审计记录", exact: true }).getByRole("row")).toHaveCount(3);
  await expect(page.getByTestId("audit-total")).toHaveText("22");
  await page.getByRole("combobox", { name: "按调用状态筛选", exact: true }).click();
  await page.getByRole("option", { name: "失败", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toHaveText("1");
  await expect(page.getByTestId("audit-success-rate")).toHaveText("0.0%");
  await expect(page.getByText("第 1 / 1 页", { exact: true })).toBeVisible();
  await page.getByText("查看趋势数据", { exact: true }).click();
  await expect(page.getByRole("table", { name: "调用趋势数据", exact: true }).getByRole("cell", { name: "1", exact: true })).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("group", { name: "调用量趋势折线图", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("audit-mobile.png"), fullPage: true });
  await page.getByLabel("工具名称", { exact: true }).fill("missing-result");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toHaveText("0");
  await expect(page.getByText("暂无匹配的趋势数据", { exact: true })).toBeVisible();
  await expect(page.getByText("暂无匹配的调用审计记录", { exact: true })).toBeVisible();
});

test("custom audit ranges validate dates, update hourly trends, and reset all query conditions", async ({ page, request }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "调用审计", exact: true })).toBeVisible();
  const role = (await (await page.request.post("/api/admin/roles", { data: { name: "Audit Range Caller" } })).json()).role;
  const created = await (await page.request.post("/api/admin/users", { data: { username: "audit-range-user", roleIds: [role.id] } })).json();
  await request.post("/api/auth/login", { data: { username: "audit-range-user", password: created.initialPassword } });
  const key = (await (await request.post("/api/keys", { data: { name: "Audit Range", expiresAt: null } })).json()).key.value;
  for (let id = 1; id <= 3; id++) await page.request.post("/mcp", {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id, method: "tools/call", params: { name: "audit-range__missing", arguments: {} } },
  });
  await page.getByRole("button", { name: "调用审计", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toBeVisible();
  const baselineTotal = await page.getByTestId("audit-total").textContent();
  await page.getByLabel("工具名称", { exact: true }).fill("audit-range__");
  await page.getByRole("combobox", { name: "时间范围", exact: true }).click();
  await page.getByRole("option", { name: "自定义范围", exact: true }).click();
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("请填写有效的开始和结束时间");
  await page.getByLabel("开始时间", { exact: true }).fill("2026-11-27T08:00");
  await page.getByLabel("结束时间（不含）", { exact: true }).fill("2026-11-26T08:00");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("结束时间必须晚于开始时间");
  const range = await page.evaluate(() => {
    const local = (time: number) => {
      const date = new Date(time);
      return new Date(time - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
    };
    return { from: local(Date.now() - 3_600_000), to: local(Date.now() + 3_600_000) };
  });
  await page.getByLabel("开始时间", { exact: true }).fill(range.from);
  await page.getByLabel("结束时间（不含）", { exact: true }).fill(range.to);
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toHaveText("3");
  await expect(page.getByText("每小时统计 · 北京时间 · 全部匹配记录", { exact: true })).toBeVisible();
  const chart = page.getByRole("group", { name: "调用量趋势折线图", exact: true });
  await chart.getByRole("img").first().focus();
  await expect(chart.getByRole("img").first()).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("audit-custom-mobile.png"), fullPage: true });
  await page.getByPlaceholder("搜索用户、服务、工具或客户端…").fill("no-matching-call");
  await expect(page.getByTestId("audit-total")).toHaveText("0");
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.getByTestId("audit-total")).toHaveText(baselineTotal!);
  await expect(page.getByRole("combobox", { name: "时间范围", exact: true })).toHaveText("最近 7 天");
  await expect(page.getByLabel("工具名称", { exact: true })).toHaveValue("");
  await expect(page.getByPlaceholder("搜索用户、服务、工具或客户端…")).toHaveValue("");
});
