# MCP 与 REST 接入实施记录

## 依据与分支

依据 [接入规格](20261122-mcp-rest-integration.md)和 [TDD 测试边界](20261122-mcp-tdd-boundaries.md)，于 2026-11-22 开始实施。用户明确要求继续使用 `dev_mcp_research_261121`。完成前不合入 main，不推送远端。

## 已实现切片

### 1. 官方 SDK 的现代上游发现

- 项目级安装并锁定 `@modelcontextprotocol/server`、`client`、`core` 2.4.0 和独立发布的 `node` 2.1.2。pnpm 使用既有共享缓存，依赖登记在 `apps/api/package.json` 与根锁文件中。
- 新增 `/mcp`，按每次请求验证当前平台 API Key、用户启用状态、过期和吊销状态。
- 使用官方 `createMcpHandler` 与 Node 适配器，复用 Express 已解析的请求体。
- 官方低层 `Server` 仅声明 tools；避免高层服务器自动声明尚未实现的 `listChanged` 通知能力。
- 空目录不公开 demo 占位工具。工具登记、执行和审计仍待后续切片。
- 失败测试：锁定现代协议的真实 SDK 客户端不能通过尚不存在的 `/mcp` 协商。
- 实现后验证：真实 TCP 连接协商为 `2026-07-28`，capabilities 为 `{tools: {}}`，tools/list 返回空目录。API 回归和前后端类型检查通过。

### 2. 部署配置的 Origin 校验

- `/mcp` 使用官方 Node `originValidation`；无 Origin 请求正常处理。
- `MCP_ALLOWED_ORIGINS` 是逗号分隔的允许来源主机名，遵循 SDK 按 hostname 校验的语义；空值拒绝所有携带 Origin 的浏览器请求。
- 该校验不限制上下游目标 IP、网段或内公网访问。
- TDD：未允许来源原先得到成功响应；接入校验后 HTTP 403。现代 SDK 发现回归与前后端类型检查通过。

## 下一步

补充协议验证：官方 SDK legacy 模式协商为 `2025-11-25`，无上游 Session ID；连接使用的 Key 吊销后新 HTTP 请求立即返回 401。这两项由已接入的 SDK 与逐请求鉴权满足，无需新增另一套协议实现。

逐项验证旧版无状态兼容、Key 生命周期与 Origin；随后按依赖顺序接入持久目录、原生下游、授权和正式审计、REST 及导入与控制台。
