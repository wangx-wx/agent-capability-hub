# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: unified-services-console.spec.ts >> administrator manages native MCP and manual REST tools through one service menu
- Location: test/unified-services-console.spec.ts:3:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('navigation', { name: '主导航' }).getByRole('button', { name: 'REST 导入', exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('navigation', { name: '主导航' }).getByRole('button', { name: 'REST 导入', exact: true }) with timeout 5000ms
  - waiting for getByRole('navigation', { name: '主导航' }).getByRole('button', { name: 'REST 导入', exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

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
          - button "REST 导入" [ref=e39] [cursor=pointer]
          - button "调用审计" [ref=e45] [cursor=pointer]
      - generic [ref=e50]:
        - generic [ref=e51]: 访问控制
        - generic [ref=e52]:
          - button "用户" [ref=e53] [cursor=pointer]
          - button "角色与授权" [ref=e60] [cursor=pointer]
          - button "API Keys" [ref=e64] [cursor=pointer]
    - generic [ref=e69]: SQLite 本地实例
  - main [ref=e72]:
    - generic [ref=e73]:
      - generic [ref=e74]:
        - generic [ref=e75]: 控制台
        - generic [ref=e76]: /
        - strong [ref=e77]: 概览
      - generic [ref=e78]:
        - generic [ref=e79]: browser-admin
        - button "退出" [ref=e84] [cursor=pointer]
    - generic [ref=e90]:
      - generic [ref=e91]:
        - generic [ref=e92]:
          - paragraph [ref=e93]:
            - generic [ref=e94]: "01"
            - generic [ref=e95]: 平台概览
          - heading "欢迎，browser-admin" [level=1] [ref=e96]
          - paragraph [ref=e97]: 查看本地实例运行状态、调用统计，并管理下游服务、角色授权与 API 凭证。
        - button "刷新状态" [ref=e98] [cursor=pointer]
      - generic [ref=e104]:
        - generic [ref=e105]:
          - generic [ref=e106]:
            - heading "实例运行状态" [level=2] [ref=e107]
            - generic [ref=e108]: RUNTIME
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]: "01"
              - generic [ref=e112]:
                - strong [ref=e113]: API 服务
                - generic [ref=e114]: Express · 本地进程
              - generic [ref=e115]: 运行正常
            - generic [ref=e117]:
              - generic [ref=e118]: "02"
              - generic [ref=e119]:
                - strong [ref=e120]: 数据库
                - generic [ref=e121]: SQLite · 单实例持久化
              - generic [ref=e122]: 已连接
            - generic [ref=e124]:
              - generic [ref=e125]: "03"
              - generic [ref=e126]:
                - strong [ref=e127]: 你的 API Keys
                - generic [ref=e128]: 当前有效签发凭证
              - generic [ref=e129]: "0"
        - generic [ref=e130]:
          - generic [ref=e131]:
            - heading "我的调用统计" [level=2] [ref=e132]
            - generic [ref=e133]: USAGE
          - paragraph [ref=e134]: 累计包含所有 API Key 的正式调用。进行中和结果未知仅计入总次数，管理员试调用不计入。
          - generic [ref=e135]:
            - generic [ref=e136]:
              - generic [ref=e137]: 总次数
              - strong [ref=e138]: "0"
            - generic [ref=e139]:
              - generic [ref=e140]: 成功数
              - strong [ref=e141]: "0"
            - generic [ref=e142]:
              - generic [ref=e143]: 失败数
              - strong [ref=e144]: "0"
      - generic [ref=e145]:
        - generic [ref=e147]:
          - heading "MCP 接入" [level=2] [ref=e148]
          - paragraph [ref=e149]: 使用你的 API Key 作为 Bearer 凭证，连接当前实例的 MCP 地址。
        - generic [ref=e150]:
          - generic [ref=e154]:
            - code [ref=e155]: http://127.0.0.1:5310/mcp
            - generic [ref=e156]: 工具列表按角色授权过滤；服务目录授权不会自动开放子工具。
          - button "复制 MCP 地址" [ref=e157] [cursor=pointer]:
            - generic [ref=e161]: 复制地址
      - generic [ref=e162]:
        - generic [ref=e164]:
          - heading "修改密码" [level=2] [ref=e165]
          - paragraph [ref=e166]: 修改后当前账号的所有网页会话都会退出，需要重新登录。
        - generic [ref=e167]:
          - generic [ref=e168]:
            - text: 当前密码
            - textbox "当前密码" [ref=e169]
          - generic [ref=e170]:
            - text: 新密码
            - textbox "新密码" [ref=e171]
          - button "更新密码" [ref=e172] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test("administrator manages native MCP and manual REST tools through one service menu", async ({ page }, testInfo) => {
  4  |   const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  5  |   await page.goto("/");
  6  |   await page.getByLabel("账号").fill("browser-admin");
  7  |   await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  8  |   await page.getByRole("button", { name: "登录", exact: true }).click();
  9  |   const navigation = page.getByRole("navigation", { name: "主导航" });
  10 |   await expect(navigation.getByRole("button", { name: "MCP 服务", exact: true })).toBeVisible();
> 11 |   await expect(navigation.getByRole("button", { name: "REST 导入", exact: true })).toHaveCount(0);
     |                                                                                  ^ Error: expect(locator).toHaveCount(expected) failed
  12 |   await navigation.getByRole("button", { name: "MCP 服务", exact: true }).click();
  13 |   await page.getByRole("button", { name: "接入服务", exact: true }).click();
  14 |   await expect(page.getByRole("heading", { name: "选择接入方式", exact: true })).toBeVisible();
  15 |   await page.screenshot({ path: testInfo.outputPath("connection-choice.png"), fullPage: true });
  16 |   await page.getByRole("button", { name: "原生 MCP", exact: true }).click();
  17 |   await page.getByLabel("服务名称", { exact: true }).fill("Unified Native");
  18 |   await page.getByLabel("服务地址", { exact: true }).fill(targets.mcp);
  19 |   await page.getByLabel("命名空间", { exact: true }).fill("unified-native");
  20 |   await page.getByLabel("启用服务", { exact: true }).check();
  21 |   await page.getByRole("button", { name: "保存服务", exact: true }).click();
  22 |   await expect(page.getByRole("heading", { name: "Unified Native", exact: true })).toBeVisible();
  23 |   await page.getByRole("button", { name: "同步工具", exact: true }).click();
  24 |   await page.getByRole("button", { name: "确认同步", exact: true }).click();
  25 |   await expect(page.getByRole("button", { name: "试调用 unified-native__echo", exact: true })).toBeVisible();
  26 |
  27 |   await page.getByRole("button", { name: "接入服务", exact: true }).click();
  28 |   await page.getByRole("button", { name: "REST API", exact: true }).click();
  29 |   await page.getByRole("button", { name: "手工定义", exact: true }).click();
  30 |   await page.getByLabel("服务名称", { exact: true }).fill("Unified REST");
  31 |   await page.getByLabel("服务地址", { exact: true }).fill(targets.rest);
  32 |   await page.getByLabel("命名空间", { exact: true }).fill("unified-rest");
  33 |   await page.getByLabel("启用服务", { exact: true }).check();
  34 |   await page.getByRole("button", { name: "保存服务", exact: true }).click();
  35 |   await expect(page.getByRole("heading", { name: "Unified REST", exact: true })).toBeVisible();
  36 |   await expect(page.getByText("配置有效", { exact: true }).last()).toBeVisible();
  37 |   await expect(page.getByRole("button", { name: "同步工具", exact: true })).toHaveCount(0);
  38 |   await page.getByRole("button", { name: "定义 REST 工具", exact: true }).click();
  39 |   await page.getByLabel("REST 工具定义", { exact: true }).fill(JSON.stringify({
  40 |     name: "read", method: "GET", path: "/read", parameters: [], example: {},
  41 |   }));
  42 |   await page.getByRole("button", { name: "保存工具", exact: true }).click();
  43 |   await page.getByRole("button", { name: "试调用 unified-rest__read", exact: true }).click();
  44 |   await page.getByRole("button", { name: "执行试调用", exact: true }).click();
  45 |   await expect(page.getByTestId("tool-result")).toContainText("accepted");
  46 |   await expect(page.getByRole("navigation", { name: "已登记服务" }).getByText("原生 MCP", { exact: true })).toBeVisible();
  47 |   await expect(page.getByRole("navigation", { name: "已登记服务" }).getByRole("button", { name: /^Unified REST/ })).toContainText("REST API");
  48 |   await page.screenshot({ path: testInfo.outputPath("unified-services.png"), fullPage: true });
  49 | });
  50 |
```
