# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: multi-import-console.spec.ts >> administrator can inspect and call each service created by a multi-target import
- Location: test/multi-import-console.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '查看 Multi Second', exact: true })

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
      - status [ref=e103]: 导入完成，共保存 2 个服务。请在角色与授权页面分配工具权限。
      - generic [ref=e104]:
        - navigation "已登记服务" [ref=e105]:
          - button "Multi First REST API multi-first 配置有效" [ref=e106] [cursor=pointer]:
            - generic [ref=e107]:
              - strong [ref=e108]: Multi First
              - generic [ref=e109]: REST API
            - generic [ref=e110]:
              - generic [ref=e111]: multi-first
              - generic [ref=e112]: 配置有效
          - button "Multi Second REST API multi-second 配置有效" [ref=e113] [cursor=pointer]:
            - generic [ref=e114]:
              - strong [ref=e115]: Multi Second
              - generic [ref=e116]: REST API
            - generic [ref=e117]:
              - generic [ref=e118]: multi-second
              - generic [ref=e119]: 配置有效
        - generic [ref=e121]:
          - generic [ref=e122]:
            - heading "Multi First" [level=2] [ref=e123]
            - paragraph [ref=e124]: http://127.0.0.1:63870/v1/first
            - generic [ref=e125]:
              - generic [ref=e126]: REST API
              - generic [ref=e127]: multi-first
              - generic [ref=e128]: 已启用
              - generic [ref=e130]: 配置有效
              - generic [ref=e131]: 超时 60s
          - generic [ref=e132]:
            - button "编辑服务" [ref=e133] [cursor=pointer]
            - button "停用服务" [ref=e138] [cursor=pointer]
            - button "导入工具" [ref=e142] [cursor=pointer]
            - button "删除服务" [ref=e148] [cursor=pointer]
          - generic [ref=e153]:
            - generic [ref=e154]:
              - generic [ref=e155]:
                - heading "工具目录" [level=2] [ref=e156]
                - paragraph [ref=e157]: 仅已确认的定义进入目录；普通角色需要精确工具授权。
              - button "定义 REST 工具" [ref=e158] [cursor=pointer]
            - generic [ref=e162]:
              - generic [ref=e163]:
                - strong [ref=e165]: multi-first__read-one
                - generic [ref=e166]:
                  - button "试调用 multi-first__read-one" [ref=e167] [cursor=pointer]:
                    - generic [ref=e170]: 试调用
                  - button "编辑 multi-first__read-one" [ref=e171] [cursor=pointer]:
                    - generic [ref=e175]: 编辑
                  - button "删除 multi-first__read-one" [ref=e176] [cursor=pointer]:
                    - generic [ref=e180]: 删除
              - group [ref=e181]:
                - generic "参数 Schema" [ref=e182] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test("administrator can inspect and call each service created by a multi-target import", async ({ page }, testInfo) => {
  4  |   const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  5  |   await page.goto("/");
  6  |   await page.getByLabel("账号").fill("browser-admin");
  7  |   await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  8  |   await page.getByRole("button", { name: "登录", exact: true }).click();
  9  |   await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  10 |   await page.getByRole("button", { name: "接入服务", exact: true }).click();
  11 |   await page.getByRole("button", { name: "REST API", exact: true }).click();
  12 |   await page.getByRole("button", { name: "OpenAPI", exact: true }).click();
  13 |   await page.getByLabel("导入原文", { exact: true }).fill(JSON.stringify({ openapi: "3.1.0", paths: {
  14 |     "/read-one": { get: { operationId: "read-one", servers: [{ url: `${targets.rest}/first` }] } },
  15 |     "/read-two": { get: { operationId: "read-two", servers: [{ url: `${targets.rest}/second` }] } },
  16 |   } }));
  17 |   await page.getByRole("button", { name: "解析预览", exact: true }).click();
  18 |   const first = page.getByRole("region", { name: "目标服务 1", exact: true });
  19 |   const second = page.getByRole("region", { name: "目标服务 2", exact: true });
  20 |   await first.getByLabel("导入服务名称", { exact: true }).fill("Multi First");
  21 |   await first.getByLabel("导入命名空间", { exact: true }).fill("multi-first");
  22 |   await first.getByLabel("导入后启用", { exact: true }).check();
  23 |   await first.getByLabel("选择 GET /read-one", { exact: true }).check();
  24 |   await second.getByLabel("导入服务名称", { exact: true }).fill("Multi Second");
  25 |   await second.getByLabel("导入命名空间", { exact: true }).fill("multi-second");
  26 |   await second.getByLabel("导入后启用", { exact: true }).check();
  27 |   await second.getByLabel("选择 GET /read-two", { exact: true }).check();
  28 |   await page.getByRole("button", { name: "确认导入", exact: true }).click();
  29 |   await expect(page.getByRole("status")).toContainText("共保存 2 个服务");
  30 |   await expect(page.getByRole("heading", { name: "Multi First", exact: true })).toBeVisible();
> 31 |   await page.getByRole("button", { name: "查看 Multi Second", exact: true }).click();
     |                                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  32 |   await expect(page.getByRole("heading", { name: "Multi Second", exact: true })).toBeVisible();
  33 |   await page.getByRole("button", { name: "试调用 multi-second__read-two", exact: true }).click();
  34 |   await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  35 |   await expect(page.getByTestId("tool-result")).toContainText("accepted");
  36 |   await page.screenshot({ path: testInfo.outputPath("multi-import-result.png"), fullPage: true });
  37 |   await page.getByRole("button", { name: "查看 Multi First", exact: true }).click();
  38 |   await expect(page.getByRole("button", { name: "试调用 multi-first__read-one", exact: true })).toBeVisible();
  39 | });
  40 |
```
