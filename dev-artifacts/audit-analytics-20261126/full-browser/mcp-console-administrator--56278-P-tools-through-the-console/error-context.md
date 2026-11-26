# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mcp-console.spec.ts >> administrator registers and confirms MCP tools through the console
- Location: test/mcp-console.spec.ts:3:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 25
```

# Page snapshot

```yaml
- generic:
  - generic:
    - region "Notifications alt+T":
      - list:
        - listitem:
          - button "Close toast"
          - generic: 工具目录同步完成
        - listitem:
          - button "Close toast"
          - generic: 服务 Browser Docs 已保存
    - generic [aria-hidden]:
      - complementary:
        - generic:
          - generic:
            - generic:
              - generic: Agent Hub
              - generic: 能力中台
          - navigation:
            - generic:
              - generic: 工作区
              - generic:
                - button:
                  - generic: 概览
            - generic:
              - generic: 能力接入
              - generic:
                - button:
                  - generic: MCP 服务
                - button:
                  - generic: 调用审计
            - generic:
              - generic: 访问控制
              - generic:
                - button:
                  - generic: 用户
                - button:
                  - generic: 角色与授权
                - button:
                  - generic: API Keys
          - generic:
            - generic: SQLite 实例 · 正常
            - button [expanded]
      - generic:
        - banner:
          - generic:
            - navigation:
              - generic:
                - button: 控制台
              - generic:
                - generic: /
                - generic: MCP 服务
          - generic:
            - generic: 管理员
            - button:
              - generic: browser-admin
        - main:
          - generic:
            - generic:
              - generic:
                - generic:
                  - heading [level=1]: MCP 服务
                  - paragraph: 统一管理服务与工具，通过原生 MCP 或 REST API 接入，在角色与授权页面分配访问权限。
                - generic:
                  - button:
                    - generic: 刷新服务
                  - button:
                    - generic: 接入服务
              - generic:
                - generic:
                  - generic:
                    - searchbox
                  - group:
                    - button [pressed]:
                      - generic: 全部
                      - generic: "6"
                    - button:
                      - generic: 原生 MCP
                      - generic: "2"
                    - button:
                      - generic: REST API
                      - generic: "4"
                  - combobox:
                    - generic: 全部状态
                - generic: 显示 6 / 6 个服务
              - generic:
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: 127.0.0.1
                        - generic: REST API
                      - generic:
                        - switch
                    - generic:
                      - generic: file-browser
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51741/v1
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 1 工具
                      - generic: 未启用
                    - generic:
                      - button: 查看工具
                      - button
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: 127.0.0.1
                        - generic: REST API
                      - generic:
                        - switch
                    - generic:
                      - generic: url-browser
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51741/v1
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 1 工具
                      - generic: 未启用
                    - generic:
                      - button: 查看工具
                      - button
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: 127.0.0.1
                        - generic: REST API
                      - generic:
                        - switch
                    - generic:
                      - generic: curl-browser
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51741/
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 1 工具
                      - generic: 未启用
                    - generic:
                      - button: 查看工具
                      - button
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: Audit Chart
                        - generic: 原生 MCP
                      - generic:
                        - switch [checked]
                    - generic:
                      - generic: audit-chart
                      - generic [aria-hidden]: ·
                      - generic: http
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51740/mcp
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 2 工具
                      - generic: 已连接
                    - generic:
                      - button: 查看工具
                      - button
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: Browser Docs
                        - generic: 原生 MCP
                      - generic:
                        - switch [checked]
                    - generic:
                      - generic: browser
                      - generic [aria-hidden]: ·
                      - generic: http
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51740/mcp
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 2 工具
                      - generic: 已连接
                    - generic:
                      - button: 查看工具
                      - button
                - article:
                  - generic:
                    - generic:
                      - generic:
                        - button: Browser REST
                        - generic: REST API
                      - generic:
                        - switch [checked]
                    - generic:
                      - generic: rest-browser
                      - generic [aria-hidden]: ·
                      - generic: http://127.0.0.1:51741/v1
                    - paragraph: 暂无服务说明
                  - generic:
                    - generic:
                      - generic: 1 工具
                      - generic: 配置有效
                    - generic:
                      - button: 查看工具
                      - button
  - dialog [aria-hidden]:
    - generic:
      - generic:
        - heading [level=2]: Browser Docs
      - generic:
        - generic:
          - generic: 已连接
          - switch [checked]
        - button
    - generic:
      - generic:
        - generic:
          - generic:
            - generic: 原生 MCP
            - generic: browser
            - generic: Streamable HTTP
            - generic: 超时 60s
            - generic: 请求头 0 项
          - generic:
            - code: http://127.0.0.1:51740/mcp
            - button
          - generic:
            - button:
              - generic: 同步工具
            - button:
              - generic: 测试连接
            - button:
              - generic: 编辑服务
            - button:
              - generic: 删除服务
        - generic:
          - generic:
            - generic:
              - heading [level=3]: 工具目录（2）
              - paragraph: 仅已确认的工具进入目录；普通角色需在「角色与授权」精确授予工具权限。
            - generic:
              - generic:
                - searchbox
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - strong: browser__count
                  - generic:
                    - paragraph: Return a count
                - generic:
                  - button:
                    - generic: 试调用
                  - button:
                    - generic: 删除
              - generic:
                - button:
                  - generic: 参数 Schema（0 个参数 · 0 个必填）
            - generic:
              - generic:
                - generic:
                  - generic:
                    - strong: browser__echo
                  - generic:
                    - paragraph: Echo text
                - generic:
                  - button:
                    - generic: 试调用
                  - button:
                    - generic: 删除
              - generic:
                - button:
                  - generic: 参数 Schema（1 个参数 · 1 个必填）
  - dialog "试调用：browser__echo" [active] [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - heading "试调用：browser__echo" [level=2] [ref=e6]
        - paragraph [ref=e7]: 管理员试调用不进入正式调用审计，也不计入用户调用统计。支持 ⌘/Ctrl + Enter 执行。
      - button "关闭" [ref=e9] [cursor=pointer]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - group "参数输入方式" [ref=e17]:
            - button "表单填参" [ref=e18] [cursor=pointer]
            - button "JSON 参数" [pressed] [ref=e20] [cursor=pointer]
          - generic [ref=e22]:
            - button "格式化" [ref=e23] [cursor=pointer]
            - button "填入示例" [ref=e28] [cursor=pointer]
        - generic [ref=e33]:
          - generic [ref=e34]: 试调用参数
          - textbox "试调用参数" [ref=e36]: "{\"text\":\"browser hello\"}"
        - button "执行试调用" [ref=e38] [cursor=pointer]
      - generic [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]: 返回结果
            - generic [ref=e46]: 执行成功
            - generic [ref=e47]: 14 ms
          - generic [ref=e48]:
            - group "结果展示方式" [ref=e49]:
              - button "友好预览" [pressed] [ref=e50] [cursor=pointer]
              - button "原始 JSON" [ref=e52] [cursor=pointer]
            - button "复制调用结果" [ref=e54] [cursor=pointer]
        - generic [ref=e58]: browser hello
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test("administrator registers and confirms MCP tools through the console", async ({ page }, testInfo) => {
  4  |   const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  5  |   await page.goto("/");
  6  |   await page.getByLabel("账号").fill("browser-admin");
  7  |   await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  8  |   await page.getByRole("button", { name: "登录", exact: true }).click();
  9  |   await page.getByRole("button", { name: "MCP 服务", exact: true }).click();
  10 |   await page.getByRole("button", { name: "接入服务", exact: true }).click();
  11 |   await page.getByRole("button", { name: "原生 MCP", exact: true }).click();
  12 |   await page.getByLabel("服务名称", { exact: true }).fill("Browser Docs");
  13 |   await page.getByLabel("服务地址", { exact: true }).fill(targets.mcp);
  14 |   await page.getByLabel("命名空间", { exact: true }).fill("browser");
  15 |   await page.getByLabel("启用服务", { exact: true }).check();
  16 |   await page.getByRole("button", { name: "保存服务", exact: true }).click();
  17 |   await expect(page.getByRole("heading", { name: "Browser Docs", exact: true })).toBeVisible();
  18 |   await page.getByRole("button", { name: "关闭", exact: true }).click();
  19 |   await page.getByRole("button", { name: "Browser Docs", exact: true }).click();
  20 |   await page.getByRole("button", { name: "同步工具", exact: true }).click();
  21 |   await expect(page.getByRole("heading", { name: "同步差异", exact: true })).toBeVisible();
  22 |   await expect(page.getByText("browser__echo", { exact: true })).toBeVisible();
  23 |   await page.getByRole("button", { name: "确认同步", exact: true }).click();
  24 |   await page.getByRole("button", { name: "试调用 browser__echo", exact: true }).click();
  25 |   await page.getByRole("button", { name: "JSON 参数", exact: true }).click();
  26 |   await page.getByLabel("试调用参数", { exact: true }).fill('{"text":"browser hello"}');
  27 |   await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  28 |   await expect(page.getByTestId("tool-result")).toContainText("browser hello");
> 29 |   await expect((await (await page.request.get("/api/usage")).json()).total).toBe(0);
     |                                                                             ^ Error: expect(received).toBe(expected) // Object.is equality
  30 |   await page.screenshot({ path: testInfo.outputPath("mcp-console.png"), fullPage: true });
  31 | });
  32 |
```
