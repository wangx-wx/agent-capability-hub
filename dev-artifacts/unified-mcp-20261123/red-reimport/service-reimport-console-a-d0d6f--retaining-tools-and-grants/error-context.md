# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: service-reimport-console.spec.ts >> administrator imports into the selected REST service while retaining tools and grants
- Location: test/service-reimport-console.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '导入工具', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e17]:
      - strong [ref=e18]: Agent Hub
      - generic [ref=e19]: 能力中台
    - navigation "主导航" [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: 工作区
        - button "概览" [ref=e24] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e32]: 能力接入
        - generic [ref=e33]:
          - button "MCP 服务" [ref=e34] [cursor=pointer]
          - button "调用审计" [ref=e39] [cursor=pointer]
      - generic [ref=e44]:
        - generic [ref=e45]: 访问控制
        - generic [ref=e46]:
          - button "用户" [ref=e47] [cursor=pointer]
          - button "角色与授权" [ref=e54] [cursor=pointer]
          - button "API Keys" [ref=e58] [cursor=pointer]
    - generic [ref=e63]: SQLite 本地实例
  - main [ref=e66]:
    - generic [ref=e67]:
      - generic [ref=e68]:
        - generic [ref=e69]: 控制台
        - generic [ref=e70]: /
        - strong [ref=e71]: MCP 服务
      - generic [ref=e72]:
        - generic [ref=e73]: browser-admin
        - button "退出" [ref=e78] [cursor=pointer]
    - generic [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - paragraph [ref=e87]:
            - generic [ref=e88]: "02"
            - generic [ref=e89]: 能力接入
          - heading "MCP 服务" [level=1] [ref=e90]
          - paragraph [ref=e91]: 统一管理服务与工具，通过原生 MCP 或 REST API 接入，在角色与授权页面分配访问权限。
        - generic [ref=e92]:
          - button "刷新服务" [ref=e93] [cursor=pointer]
          - button "接入服务" [ref=e100] [cursor=pointer]
      - generic [ref=e103]:
        - navigation "已登记服务" [ref=e104]:
          - button "Reimport Unified REST API reimport-unified 配置有效" [active] [ref=e105] [cursor=pointer]:
            - generic [ref=e106]:
              - strong [ref=e107]: Reimport Unified
              - generic [ref=e108]: REST API
            - generic [ref=e109]:
              - generic [ref=e110]: reimport-unified
              - generic [ref=e111]: 配置有效
        - generic [ref=e113]:
          - generic [ref=e114]:
            - heading "Reimport Unified" [level=2] [ref=e115]
            - paragraph [ref=e116]: http://127.0.0.1:62834/
            - generic [ref=e117]:
              - generic [ref=e118]: REST API
              - generic [ref=e119]: reimport-unified
              - generic [ref=e120]: 已启用
              - generic [ref=e122]: 配置有效
              - generic [ref=e123]: 超时 60s
          - generic [ref=e124]:
            - button "编辑服务" [ref=e125] [cursor=pointer]
            - button "停用服务" [ref=e130] [cursor=pointer]
            - button "删除服务" [ref=e134] [cursor=pointer]
          - generic [ref=e139]:
            - generic [ref=e140]:
              - generic [ref=e141]:
                - heading "工具目录" [level=2] [ref=e142]
                - paragraph [ref=e143]: 仅已确认的定义进入目录；普通角色需要精确工具授权。
              - button "定义 REST 工具" [ref=e144] [cursor=pointer]
            - generic [ref=e147]:
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - strong [ref=e151]: reimport-unified__keep
                  - generic [ref=e152]:
                    - button "试调用 reimport-unified__keep" [ref=e153] [cursor=pointer]:
                      - generic [ref=e156]: 试调用
                    - button "编辑 reimport-unified__keep" [ref=e157] [cursor=pointer]:
                      - generic [ref=e161]: 编辑
                    - button "删除 reimport-unified__keep" [ref=e162] [cursor=pointer]:
                      - generic [ref=e166]: 删除
                - group [ref=e167]:
                  - generic "参数 Schema" [ref=e168] [cursor=pointer]
              - generic [ref=e169]:
                - generic [ref=e170]:
                  - strong [ref=e172]: reimport-unified__old
                  - generic [ref=e173]:
                    - button "试调用 reimport-unified__old" [ref=e174] [cursor=pointer]:
                      - generic [ref=e177]: 试调用
                    - button "编辑 reimport-unified__old" [ref=e178] [cursor=pointer]:
                      - generic [ref=e182]: 编辑
                    - button "删除 reimport-unified__old" [ref=e183] [cursor=pointer]:
                      - generic [ref=e187]: 删除
                - group [ref=e188]:
                  - generic "参数 Schema" [ref=e189] [cursor=pointer]
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
> 22 |   await page.getByRole("button", { name: "导入工具", exact: true }).click();
     |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  51 | });
  52 |
```
