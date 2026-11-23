# Agent Capability Hub

自托管的 MCP 与 REST 能力平台，提供服务登记、工具发现与导入、角色授权、API Key 调用、审计及控制台。

要求 Node.js 24 LTS、pnpm 11。依赖均在项目中管理。

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

填写 `.env` 的管理员账号和密码后运行 `pnpm dev`，控制台地址为 `http://localhost:5173`，API 默认监听 `0.0.0.0:3100`。开发代理同时支持 `/api` 和 `/mcp`；SQLite 默认保存在 `data/agent-capability-hub.sqlite`。

[接入与部署说明](specs/20261123-mcp-operations.md)包含 MCP/REST 管理流程、OpenAPI/cURL 导入、Claude Code/Codex 配置、环境变量及接口索引。[接入规格](specs/20261122-mcp-rest-integration.md)记录本轮确认的行为边界。

[后端目录约定](specs/20261123-backend-directory-structure.md)说明业务模块、数据库迁移、配置、运维脚本和测试的文件归属。

```sh
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm build
```

浏览器测试使用独立内存数据库和受控下游，优先使用本机 Chrome；可用 `PLAYWRIGHT_CHROME_PATH` 指定浏览器。测试结束自动释放服务器、浏览器和数据库。

生产运行 `pnpm build`、`pnpm --filter @ach/api start`，由部署者的 Web 服务提供 `apps/web/dist/` 并同源代理 `/api`、`/mcp`。API Key 和下游静态凭证明文存储于 SQLite，按部署环境保护数据库及备份。
