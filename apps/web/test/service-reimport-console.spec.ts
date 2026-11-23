import { test, expect } from "@playwright/test";

test("administrator imports into the selected REST service while retaining tools and grants", async ({ page }, testInfo) => {
  const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  await page.goto("/");
  await page.getByLabel("账号").fill("browser-admin");
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "MCP 服务", exact: true })).toBeVisible();
  const url = new URL(targets.rest).origin;
  const { service } = await (await page.request.post("/api/admin/services", { data: {
    name: "Reimport Unified", namespace: "reimport-unified", kind: "rest", url, enabled: true,
    headers: { Authorization: "Bearer configured-service" },
  } })).json();
  const route = `/api/admin/services/${service.id}/tools`;
  const { tool: old } = await (await page.request.post(route, { data: { name: "old", method: "GET", path: "/v1/read" } })).json();
  const { tool: keep } = await (await page.request.post(route, { data: { name: "keep", method: "GET", path: "/keep" } })).json();
  const { role } = await (await page.request.post("/api/admin/roles", { data: { name: "Unified Import Role" } })).json();
  await page.request.put(`/api/admin/roles/${role.id}/resources`, { data: { resourceIds: [old.id] } });
  await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  await page.getByRole("button", { name: /^Reimport Unified/ }).click();
  await page.getByRole("button", { name: "导入工具", exact: true }).click();
  await expect(page.getByRole("heading", { name: "导入工具：Reimport Unified", exact: true })).toBeVisible();
  await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify({ openapi: "3.1.0", servers: [{ url }], paths: {
    "/v1/read": { get: { operationId: "read-renamed" } },
    "/v1/new": { get: { operationId: "not-selected" } },
  } }));
  await page.getByRole("button", { name: "解析预览", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "保存方式", exact: true })).toHaveValue(service.id);
  await expect(page.getByLabel("导入命名空间", { exact: true })).toHaveValue("reimport-unified");
  await expect(page.getByLabel("导入后启用", { exact: true })).toBeChecked();
  await page.getByLabel("选择 GET /v1/read", { exact: true }).check();
  await page.screenshot({ path: testInfo.outputPath("service-reimport.png"), fullPage: true });
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reimport Unified", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "试调用 reimport-unified__read-renamed", exact: true })).toBeVisible();
  const saved = await (await page.request.get(route)).json();
  expect(saved.tools.map((tool: { id: string }) => tool.id).sort()).toEqual([old.id, keep.id].sort());
  expect((await (await page.request.get(`/api/admin/roles/${role.id}/resources`)).json()).resourceIds).toEqual([old.id]);

  await page.getByRole("button", { name: "导入工具", exact: true }).click();
  await page.getByRole("button", { name: "cURL", exact: true }).click();
  await page.getByLabel("导入原文", { exact: true }).fill(`curl '${url}/v1/read'`);
  await page.getByRole("button", { name: "解析预览", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "保存方式", exact: true })).toHaveValue(service.id);
  await page.getByLabel("选择 GET /v1/read", { exact: true }).check();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reimport Unified", exact: true })).toBeVisible();
  expect((await (await page.request.get(route)).json()).tools.map((tool: { id: string }) => tool.id).sort()).toEqual([old.id, keep.id].sort());
  expect((await (await page.request.get(`/api/admin/services/${service.id}`)).json()).service.headers).toEqual({ Authorization: "Bearer configured-service" });
});
