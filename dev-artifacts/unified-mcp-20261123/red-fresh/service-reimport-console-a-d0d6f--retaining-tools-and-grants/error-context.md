# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: service-reimport-console.spec.ts >> administrator imports into the selected REST service while retaining tools and grants
- Location: test/service-reimport-console.spec.ts:3:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('button', { name: 'REST API', exact: true })
Expected: "false"
Received: "true"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByRole('button', { name: 'REST API', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'REST API', exact: true })
    14 × locator resolved to <button type="button" aria-pressed="true" aria-label="REST API" class="connection-option selected">…</button>
       - unexpected value "true"

```

```yaml
- button "REST API" [pressed]:
  - strong: REST API
  - text: 将 HTTP API 映射为 MCP 工具。
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test("administrator imports into the selected REST service while retaining tools and grants", async ({ page }, testInfo) => {
  4  |   const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  5  |   await page.goto("/");
  6  |   await page.getByLabel("账号").fill("browser-admin");
  7  |   await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  8  |   await page.getByRole("button", { name: "登录", exact: true }).click();
  9  |   await expect(page.getByRole("button", { name: "MCP 服务", exact: true })).toBeVisible();
  10 |   const url = new URL(targets.rest).origin;
  11 |   const { service } = await (await page.request.post("/api/admin/services", { data: {
  12 |     name: "Reimport Unified", namespace: "reimport-unified", kind: "rest", url, enabled: true,
  13 |     headers: { Authorization: "Bearer configured-service" },
  14 |   } })).json();
  15 |   const route = `/api/admin/services/${service.id}/tools`;
  16 |   const { tool: old } = await (await page.request.post(route, { data: { name: "old", method: "GET", path: "/v1/read" } })).json();
  17 |   const { tool: keep } = await (await page.request.post(route, { data: { name: "keep", method: "GET", path: "/keep" } })).json();
  18 |   const { role } = await (await page.request.post("/api/admin/roles", { data: { name: "Unified Import Role" } })).json();
  19 |   await page.request.put(`/api/admin/roles/${role.id}/resources`, { data: { resourceIds: [old.id] } });
  20 |   await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  21 |   await page.getByRole("button", { name: /^Reimport Unified/ }).click();
  22 |   await page.getByRole("button", { name: "导入工具", exact: true }).click();
  23 |   await expect(page.getByRole("heading", { name: "导入工具：Reimport Unified", exact: true })).toBeVisible();
  24 |   await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify({ openapi: "3.1.0", servers: [{ url }], paths: {
  25 |     "/v1/read": { get: { operationId: "read-renamed" } },
  26 |     "/v1/new": { get: { operationId: "not-selected" } },
  27 |   } }));
  28 |   await page.getByRole("button", { name: "解析预览", exact: true }).click();
  29 |   await expect(page.getByRole("combobox", { name: "保存方式", exact: true })).toHaveValue(service.id);
  30 |   await expect(page.getByLabel("导入命名空间", { exact: true })).toHaveValue("reimport-unified");
  31 |   await expect(page.getByLabel("导入后启用", { exact: true })).toBeChecked();
  32 |   await page.getByLabel("选择 GET /v1/read", { exact: true }).check();
  33 |   await page.screenshot({ path: testInfo.outputPath("service-reimport.png"), fullPage: true });
  34 |   await page.getByRole("button", { name: "确认导入", exact: true }).click();
  35 |   await expect(page.getByRole("heading", { name: "Reimport Unified", exact: true })).toBeVisible();
  36 |   await expect(page.getByRole("button", { name: "试调用 reimport-unified__read-renamed", exact: true })).toBeVisible();
  37 |   const saved = await (await page.request.get(route)).json();
  38 |   expect(saved.tools.map((tool: { id: string }) => tool.id).sort()).toEqual([old.id, keep.id].sort());
  39 |   expect((await (await page.request.get(`/api/admin/roles/${role.id}/resources`)).json()).resourceIds).toEqual([old.id]);
  40 |
  41 |   await page.getByRole("button", { name: "导入工具", exact: true }).click();
  42 |   await page.getByRole("button", { name: "cURL", exact: true }).click();
  43 |   await page.getByLabel("导入原文", { exact: true }).fill(`curl '${url}/v1/read'`);
  44 |   await page.getByRole("button", { name: "解析预览", exact: true }).click();
  45 |   await expect(page.getByRole("combobox", { name: "保存方式", exact: true })).toHaveValue(service.id);
  46 |   await page.getByLabel("选择 GET /v1/read", { exact: true }).check();
  47 |   await page.getByRole("button", { name: "确认导入", exact: true }).click();
  48 |   await expect(page.getByRole("heading", { name: "Reimport Unified", exact: true })).toBeVisible();
  49 |   expect((await (await page.request.get(route)).json()).tools.map((tool: { id: string }) => tool.id).sort()).toEqual([old.id, keep.id].sort());
  50 |   expect((await (await page.request.get(`/api/admin/services/${service.id}`)).json()).service.headers).toEqual({ Authorization: "Bearer configured-service" });
  51 |
  52 |   await page.getByRole("button", { name: "导入工具", exact: true }).click();
  53 |   await page.getByLabel("导入原文", { exact: true }).fill("unfinished import");
  54 |   await page.getByRole("button", { name: "接入服务", exact: true }).click();
> 55 |   await expect(page.getByRole("button", { name: "REST API", exact: true })).toHaveAttribute("aria-pressed", "false");
     |                                                                             ^ Error: expect(locator).toHaveAttribute(expected) failed
  56 |   await expect(page.getByLabel("导入原文", { exact: true })).toHaveCount(0);
  57 |   await page.getByRole("button", { name: "REST API", exact: true }).click();
  58 |   await page.getByRole("button", { name: "OpenAPI", exact: true }).click();
  59 |   await expect(page.getByLabel("导入原文", { exact: true })).toHaveValue("");
  60 |   await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify({ openapi: "3.1.0", servers: [{ url }], paths: { "/fresh": { get: {} } } }));
  61 |   await page.getByRole("button", { name: "解析预览", exact: true }).click();
  62 |   await expect(page.getByRole("combobox", { name: "保存方式", exact: true })).toHaveValue("");
  63 | });
  64 |
```
