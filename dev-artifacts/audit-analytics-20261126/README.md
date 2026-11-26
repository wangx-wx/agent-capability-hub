# 审计增强验证产物

对应规格：[审计查询与趋势展示](../../specs/20261126-audit-analytics.md)。

- `red-browser/`：新增浏览器测试在页面尚未提供独立查询字段时的失败上下文。
- `green-browser/`：首次通过的桌面、手机截图。
- `browser-integration/`：新增查询测试与普通用户审计流程的联动验证截图。
- `full-browser/`：完整回归的首次输出，包含共享管理员测试数据冲突的失败上下文。
- `final-browser/`：修正测试账号隔离后，11 条完整回归全部通过的截图和运行状态。
- `viewport-regression/`：完整回归产生的四种视口截图副本；原有历史截图保持原样。

最终完整回归命令：

```sh
pnpm --filter @ach/web exec playwright test --output ../../dev-artifacts/audit-analytics-20261126/final-browser
```

后端验证命令：`pnpm test`（62 条通过）；构建命令：`pnpm build`（通过）。
