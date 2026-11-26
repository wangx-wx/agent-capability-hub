# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-analytics-console.spec.ts >> audit queries update full-result metrics and trends independently of pagination
- Location: test/audit-analytics-console.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('工具名称', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e18]:
          - generic [ref=e19]: Agent Hub
          - generic [ref=e20]: 能力中台
        - navigation "主导航" [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: 工作区
            - button "概览" [ref=e25] [cursor=pointer]
          - generic [ref=e32]:
            - generic [ref=e33]: 能力接入
            - generic [ref=e34]:
              - button "MCP 服务" [ref=e35] [cursor=pointer]
              - button "调用审计" [active] [ref=e40] [cursor=pointer]
          - generic [ref=e45]:
            - generic [ref=e46]: 访问控制
            - generic [ref=e47]:
              - button "用户" [ref=e48] [cursor=pointer]
              - button "角色与授权" [ref=e55] [cursor=pointer]
              - button "API Keys" [ref=e59] [cursor=pointer]
        - generic [ref=e64]:
          - generic [ref=e65]: SQLite 实例 · 正常
          - button "收起侧栏" [expanded] [ref=e68] [cursor=pointer]
    - generic [ref=e72]:
      - banner [ref=e73]:
        - navigation "面包屑" [ref=e75]:
          - button "控制台" [ref=e77] [cursor=pointer]
          - generic [ref=e78]:
            - generic [ref=e79]: /
            - generic [ref=e80]: 调用审计
        - generic [ref=e81]:
          - generic [ref=e82]: 管理员
          - button "账号菜单" [ref=e83] [cursor=pointer]:
            - generic [ref=e87]: browser-admin
      - main [ref=e90]:
        - generic [ref=e92]:
          - generic [ref=e93]:
            - generic [ref=e94]:
              - heading "调用审计" [level=1] [ref=e95]
              - paragraph [ref=e96]: 保留每次正式工具调用的用户、服务、工具名称、耗时与结果状态；管理员控制台试调用不写入审计。
            - button "刷新审计" [ref=e98] [cursor=pointer]:
              - generic [ref=e104]: 刷新
          - generic [ref=e105]:
            - generic [ref=e106]:
              - searchbox "搜索用户、服务、工具或客户端…" [ref=e108]
              - combobox "按调用状态筛选" [ref=e109] [cursor=pointer]:
                - generic: 全部状态
              - combobox "每页显示条数" [ref=e113] [cursor=pointer]:
                - generic: 每页 100 条
            - generic [ref=e117]: 共 22 条记录
          - generic [ref=e119]:
            - table [ref=e121]:
              - rowgroup [ref=e122]:
                - row [ref=e123]:
                  - columnheader "时间" [ref=e124]
                  - columnheader "用户" [ref=e125]
                  - columnheader "服务" [ref=e126]
                  - columnheader "工具" [ref=e127]
                  - columnheader "耗时" [ref=e128]
                  - columnheader "状态" [ref=e129]
                  - columnheader "客户端" [ref=e130]
              - rowgroup [ref=e131]:
                - row [ref=e132]:
                  - cell "2026/11/26 18:06:17" [ref=e133]
                  - cell [ref=e134]:
                    - strong [ref=e135]: browser-admin
                  - cell "—" [ref=e136]
                  - cell "audit-chart__missing 复制工具名称 audit-chart__missing" [ref=e137]:
                    - generic [ref=e138]:
                      - generic [ref=e139]: audit-chart__missing
                      - button "复制工具名称 audit-chart__missing" [ref=e140] [cursor=pointer]
                  - cell "0 ms" [ref=e144]
                  - cell "失败" [ref=e145]
                  - cell "—" [ref=e148]
                - row [ref=e150]:
                  - cell "2026/11/26 18:06:17" [ref=e151]
                  - cell [ref=e152]:
                    - strong [ref=e153]: browser-admin
                  - cell "Audit Chart" [ref=e154]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e155]:
                    - generic [ref=e156]:
                      - generic [ref=e157]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e158] [cursor=pointer]
                  - cell "1 ms" [ref=e162]
                  - cell "成功" [ref=e163]
                  - cell "—" [ref=e166]
                - row [ref=e168]:
                  - cell "2026/11/26 18:06:17" [ref=e169]
                  - cell [ref=e170]:
                    - strong [ref=e171]: browser-admin
                  - cell "Audit Chart" [ref=e172]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e173]:
                    - generic [ref=e174]:
                      - generic [ref=e175]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e176] [cursor=pointer]
                  - cell "2 ms" [ref=e180]
                  - cell "成功" [ref=e181]
                  - cell "—" [ref=e184]
                - row [ref=e186]:
                  - cell "2026/11/26 18:06:17" [ref=e187]
                  - cell [ref=e188]:
                    - strong [ref=e189]: browser-admin
                  - cell "Audit Chart" [ref=e190]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e191]:
                    - generic [ref=e192]:
                      - generic [ref=e193]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e194] [cursor=pointer]
                  - cell "2 ms" [ref=e198]
                  - cell "成功" [ref=e199]
                  - cell "—" [ref=e202]
                - row [ref=e204]:
                  - cell "2026/11/26 18:06:17" [ref=e205]
                  - cell [ref=e206]:
                    - strong [ref=e207]: browser-admin
                  - cell "Audit Chart" [ref=e208]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e209]:
                    - generic [ref=e210]:
                      - generic [ref=e211]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e212] [cursor=pointer]
                  - cell "2 ms" [ref=e216]
                  - cell "成功" [ref=e217]
                  - cell "—" [ref=e220]
                - row [ref=e222]:
                  - cell "2026/11/26 18:06:17" [ref=e223]
                  - cell [ref=e224]:
                    - strong [ref=e225]: browser-admin
                  - cell "Audit Chart" [ref=e226]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e227]:
                    - generic [ref=e228]:
                      - generic [ref=e229]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e230] [cursor=pointer]
                  - cell "3 ms" [ref=e234]
                  - cell "成功" [ref=e235]
                  - cell "—" [ref=e238]
                - row [ref=e240]:
                  - cell "2026/11/26 18:06:17" [ref=e241]
                  - cell [ref=e242]:
                    - strong [ref=e243]: browser-admin
                  - cell "Audit Chart" [ref=e244]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e245]:
                    - generic [ref=e246]:
                      - generic [ref=e247]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e248] [cursor=pointer]
                  - cell "3 ms" [ref=e252]
                  - cell "成功" [ref=e253]
                  - cell "—" [ref=e256]
                - row [ref=e258]:
                  - cell "2026/11/26 18:06:17" [ref=e259]
                  - cell [ref=e260]:
                    - strong [ref=e261]: browser-admin
                  - cell "Audit Chart" [ref=e262]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e263]:
                    - generic [ref=e264]:
                      - generic [ref=e265]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e266] [cursor=pointer]
                  - cell "2 ms" [ref=e270]
                  - cell "成功" [ref=e271]
                  - cell "—" [ref=e274]
                - row [ref=e276]:
                  - cell "2026/11/26 18:06:17" [ref=e277]
                  - cell [ref=e278]:
                    - strong [ref=e279]: browser-admin
                  - cell "Audit Chart" [ref=e280]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e281]:
                    - generic [ref=e282]:
                      - generic [ref=e283]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e284] [cursor=pointer]
                  - cell "2 ms" [ref=e288]
                  - cell "成功" [ref=e289]
                  - cell "—" [ref=e292]
                - row [ref=e294]:
                  - cell "2026/11/26 18:06:17" [ref=e295]
                  - cell [ref=e296]:
                    - strong [ref=e297]: browser-admin
                  - cell "Audit Chart" [ref=e298]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e299]:
                    - generic [ref=e300]:
                      - generic [ref=e301]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e302] [cursor=pointer]
                  - cell "2 ms" [ref=e306]
                  - cell "成功" [ref=e307]
                  - cell "—" [ref=e310]
                - row [ref=e312]:
                  - cell "2026/11/26 18:06:17" [ref=e313]
                  - cell [ref=e314]:
                    - strong [ref=e315]: browser-admin
                  - cell "Audit Chart" [ref=e316]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e317]:
                    - generic [ref=e318]:
                      - generic [ref=e319]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e320] [cursor=pointer]
                  - cell "2 ms" [ref=e324]
                  - cell "成功" [ref=e325]
                  - cell "—" [ref=e328]
                - row [ref=e330]:
                  - cell "2026/11/26 18:06:17" [ref=e331]
                  - cell [ref=e332]:
                    - strong [ref=e333]: browser-admin
                  - cell "Audit Chart" [ref=e334]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e335]:
                    - generic [ref=e336]:
                      - generic [ref=e337]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e338] [cursor=pointer]
                  - cell "2 ms" [ref=e342]
                  - cell "成功" [ref=e343]
                  - cell "—" [ref=e346]
                - row [ref=e348]:
                  - cell "2026/11/26 18:06:17" [ref=e349]
                  - cell [ref=e350]:
                    - strong [ref=e351]: browser-admin
                  - cell "Audit Chart" [ref=e352]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e353]:
                    - generic [ref=e354]:
                      - generic [ref=e355]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e356] [cursor=pointer]
                  - cell "2 ms" [ref=e360]
                  - cell "成功" [ref=e361]
                  - cell "—" [ref=e364]
                - row [ref=e366]:
                  - cell "2026/11/26 18:06:17" [ref=e367]
                  - cell [ref=e368]:
                    - strong [ref=e369]: browser-admin
                  - cell "Audit Chart" [ref=e370]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e371]:
                    - generic [ref=e372]:
                      - generic [ref=e373]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e374] [cursor=pointer]
                  - cell "2 ms" [ref=e378]
                  - cell "成功" [ref=e379]
                  - cell "—" [ref=e382]
                - row [ref=e384]:
                  - cell "2026/11/26 18:06:17" [ref=e385]
                  - cell [ref=e386]:
                    - strong [ref=e387]: browser-admin
                  - cell "Audit Chart" [ref=e388]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e389]:
                    - generic [ref=e390]:
                      - generic [ref=e391]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e392] [cursor=pointer]
                  - cell "3 ms" [ref=e396]
                  - cell "成功" [ref=e397]
                  - cell "—" [ref=e400]
                - row [ref=e402]:
                  - cell "2026/11/26 18:06:17" [ref=e403]
                  - cell [ref=e404]:
                    - strong [ref=e405]: browser-admin
                  - cell "Audit Chart" [ref=e406]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e407]:
                    - generic [ref=e408]:
                      - generic [ref=e409]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e410] [cursor=pointer]
                  - cell "3 ms" [ref=e414]
                  - cell "成功" [ref=e415]
                  - cell "—" [ref=e418]
                - row [ref=e420]:
                  - cell "2026/11/26 18:06:17" [ref=e421]
                  - cell [ref=e422]:
                    - strong [ref=e423]: browser-admin
                  - cell "Audit Chart" [ref=e424]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e425]:
                    - generic [ref=e426]:
                      - generic [ref=e427]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e428] [cursor=pointer]
                  - cell "2 ms" [ref=e432]
                  - cell "成功" [ref=e433]
                  - cell "—" [ref=e436]
                - row [ref=e438]:
                  - cell "2026/11/26 18:06:17" [ref=e439]
                  - cell [ref=e440]:
                    - strong [ref=e441]: browser-admin
                  - cell "Audit Chart" [ref=e442]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e443]:
                    - generic [ref=e444]:
                      - generic [ref=e445]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e446] [cursor=pointer]
                  - cell "4 ms" [ref=e450]
                  - cell "成功" [ref=e451]
                  - cell "—" [ref=e454]
                - row [ref=e456]:
                  - cell "2026/11/26 18:06:17" [ref=e457]
                  - cell [ref=e458]:
                    - strong [ref=e459]: browser-admin
                  - cell "Audit Chart" [ref=e460]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e461]:
                    - generic [ref=e462]:
                      - generic [ref=e463]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e464] [cursor=pointer]
                  - cell "5 ms" [ref=e468]
                  - cell "成功" [ref=e469]
                  - cell "—" [ref=e472]
                - row [ref=e474]:
                  - cell "2026/11/26 18:06:17" [ref=e475]
                  - cell [ref=e476]:
                    - strong [ref=e477]: browser-admin
                  - cell "Audit Chart" [ref=e478]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e479]:
                    - generic [ref=e480]:
                      - generic [ref=e481]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e482] [cursor=pointer]
                  - cell "7 ms" [ref=e486]
                  - cell "成功" [ref=e487]
                  - cell "—" [ref=e490]
                - row [ref=e492]:
                  - cell "2026/11/26 18:06:17" [ref=e493]
                  - cell [ref=e494]:
                    - strong [ref=e495]: browser-admin
                  - cell "Audit Chart" [ref=e496]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e497]:
                    - generic [ref=e498]:
                      - generic [ref=e499]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e500] [cursor=pointer]
                  - cell "10 ms" [ref=e504]
                  - cell "成功" [ref=e505]
                  - cell "—" [ref=e508]
                - row [ref=e510]:
                  - cell "2026/11/26 18:06:17" [ref=e511]
                  - cell [ref=e512]:
                    - strong [ref=e513]: browser-admin
                  - cell "Audit Chart" [ref=e514]
                  - cell "audit-chart__echo 复制工具名称 audit-chart__echo" [ref=e515]:
                    - generic [ref=e516]:
                      - generic [ref=e517]: audit-chart__echo
                      - button "复制工具名称 audit-chart__echo" [ref=e518] [cursor=pointer]
                  - cell "42 ms" [ref=e522]
                  - cell "成功" [ref=e523]
                  - cell "—" [ref=e526]
            - generic [ref=e528]:
              - generic [ref=e529]: 第 1 / 1 页
              - generic [ref=e530]:
                - button "上一页" [disabled] [ref=e531]
                - button "下一页" [disabled] [ref=e532]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test("audit queries update full-result metrics and trends independently of pagination", async ({ page }, testInfo) => {
  4  |   await page.goto("/");
  5  |   await page.getByLabel("账号").fill("browser-admin");
  6  |   await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  7  |   await page.getByRole("button", { name: "登录", exact: true }).click();
  8  |   await expect(page.getByRole("button", { name: "调用审计", exact: true })).toBeVisible();
  9  |   const targets = await (await page.request.get("http://127.0.0.1:3310/__fixture__/targets")).json();
  10 |   const service = (await (await page.request.post("/api/admin/services", { data: {
  11 |     name: "Audit Chart", namespace: "audit-chart", kind: "mcp", url: targets.mcp, enabled: true,
  12 |   } })).json()).service;
  13 |   const preview = (await (await page.request.post(`/api/admin/services/${service.id}/sync-preview`)).json()).preview;
  14 |   await page.request.post(`/api/admin/services/${service.id}/sync-confirm`, { data: { previewId: preview.id } });
  15 |   const key = (await (await page.request.post("/api/keys", { data: { name: "Audit Chart", expiresAt: null } })).json()).key.value;
  16 |   const headers = { Authorization: `Bearer ${key}`, Accept: "application/json, text/event-stream" };
  17 |   for (let id = 1; id <= 22; id++) {
  18 |     const response = await page.request.post("/mcp", { headers, data: {
  19 |       jsonrpc: "2.0", id, method: "tools/call", params: {
  20 |         name: id === 22 ? "audit-chart__missing" : "audit-chart__echo", arguments: { text: "chart" },
  21 |       },
  22 |     } });
  23 |     expect(response.ok()).toBe(true);
  24 |   }
  25 |   await page.getByRole("button", { name: "调用审计", exact: true }).click();
> 26 |   await page.getByLabel("工具名称", { exact: true }).fill("audit-chart__");
     |                                                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  27 |   await page.getByRole("button", { name: "查询", exact: true }).click();
  28 |   await expect(page.getByTestId("audit-total")).toHaveText("22");
  29 |   await expect(page.getByTestId("audit-failed")).toHaveText("1");
  30 |   await expect(page.getByTestId("audit-success-rate")).toHaveText("95.5%");
  31 |   await expect(page.getByTestId("audit-average-duration")).not.toHaveText("—");
  32 |   await expect(page.getByRole("group", { name: "调用量趋势折线图", exact: true })).toBeVisible();
  33 |   await page.screenshot({ path: testInfo.outputPath("audit-desktop.png"), fullPage: true });
  34 |   await page.getByRole("combobox", { name: "每页显示条数", exact: true }).click();
  35 |   await page.getByRole("option", { name: "每页 20 条", exact: true }).click();
  36 |   await expect(page.getByRole("table", { name: "审计记录", exact: true }).getByRole("row")).toHaveCount(21);
  37 |   await page.getByRole("button", { name: "下一页", exact: true }).click();
  38 |   await expect(page.getByRole("table", { name: "审计记录", exact: true }).getByRole("row")).toHaveCount(3);
  39 |   await expect(page.getByTestId("audit-total")).toHaveText("22");
  40 |   await page.getByRole("combobox", { name: "按调用状态筛选", exact: true }).click();
  41 |   await page.getByRole("option", { name: "失败", exact: true }).click();
  42 |   await expect(page.getByTestId("audit-total")).toHaveText("1");
  43 |   await expect(page.getByTestId("audit-success-rate")).toHaveText("0.0%");
  44 |   await expect(page.getByText("第 1 / 1 页", { exact: true })).toBeVisible();
  45 |   await page.getByText("查看趋势数据", { exact: true }).click();
  46 |   await expect(page.getByRole("table", { name: "调用趋势数据", exact: true }).getByRole("cell", { name: "1", exact: true })).toHaveCount(2);
  47 |   await page.setViewportSize({ width: 390, height: 844 });
  48 |   await expect(page.getByRole("group", { name: "调用量趋势折线图", exact: true })).toBeVisible();
  49 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  50 |   await page.screenshot({ path: testInfo.outputPath("audit-mobile.png"), fullPage: true });
  51 |   await page.getByLabel("工具名称", { exact: true }).fill("missing-result");
  52 |   await page.getByRole("button", { name: "查询", exact: true }).click();
  53 |   await expect(page.getByTestId("audit-total")).toHaveText("0");
  54 |   await expect(page.getByText("暂无匹配的趋势数据", { exact: true })).toBeVisible();
  55 |   await expect(page.getByText("暂无匹配的调用审计记录", { exact: true })).toBeVisible();
  56 | });
  57 |
```
