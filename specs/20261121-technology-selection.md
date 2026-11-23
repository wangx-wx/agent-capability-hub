# Agent 能力中台技术选型与周期

## 决策状态

已确定首期技术方向。周期是基于当前产品规格的规划估算，技术验证结束后再细化为迭代计划。

## 技术选型

- **运行时与语言**：Node.js LTS、TypeScript。
- **后端**：Express，采用模块化单体；管理 API、用户工作台 API 和 MCP 网关在同一服务中按模块组织。
- **MCP**：官方 MCP TypeScript SDK。首周验证上游 Streamable HTTP、下游 Streamable HTTP 与旧版 SSE 的组合和会话生命周期。
- **数据库**：当前阶段只使用 SQLite；是否引入 PostgreSQL 留待后续决策。
- **数据库访问**：Kysely + SQLite dialect。数据库访问集中在数据访问模块，业务模块不拼接 SQLite 专属 SQL；暂不实现 PostgreSQL dialect。
- **可移植性约束**：保留后续评估 PostgreSQL 的空间，优先使用应用生成的 UUID 字符串、文本化结构数据和 UTC ISO 8601 时间；在 PostgreSQL 被正式选定并验证前，不宣称跨库兼容。
- **迁移与验证**：迁移使用 Kysely migration API；当前测试只运行 SQLite。PostgreSQL 支持和对应集成测试待后续选型后再增加。
- **前端**：React、TypeScript、Vite；管理控制台、用户工作台和公开 Skills 广场作为同一 Web 应用中的独立路由入口。
- **仓库与部署**：pnpm workspace；当前默认自托管单实例和 SQLite 文件，不需要 PostgreSQL 服务。
- **测试**：Vitest 单元与服务测试、SQLite 数据库测试；Playwright 覆盖当前认证与授权过滤阶段。PostgreSQL 集成测试待选定并实现 PostgreSQL 后加入。

## 后续 PostgreSQL 评估

SQLite 是当前唯一实现和测试的数据库。保留 Kysely 数据访问边界和常见可移植数据表示，但 SQLite 文件不能通过修改配置自动变成 PostgreSQL。

切换目标是保留后续增加 PostgreSQL 支持的路径；届时仍需实现并验证 PostgreSQL dialect、迁移和数据搬迁，不能只切换连接配置。

是否正式支持 PostgreSQL、数据搬迁工具、测试矩阵和 SQLite 的长期支持边界，均在决定引入 PostgreSQL 时另行规格化。本阶段不实现 PostgreSQL 连接，也不运行 PostgreSQL 测试。

## 实施周期估算

估算包含首期范围，不包含 A2A。假设有可持续投入的开发人员、首期不接企业 IdP，并包含自动化测试、基础部署文档和安全检查。

| 阶段 | 内容 | 估算 |
|---|---|---:|
| 技术验证与决策收敛 | MCP SDK 传输验证、OpenAPI/cURL 和 Skills 解析边界确认、管理员首次登录与恢复方案 | 1 周 |
| 基础平台 | 项目骨架、数据库迁移、用户/API Key、平台管理员身份、角色与工具授权 | 2 周 |
| MCP 网关与审计 | 下游 MCP 注册、Streamable HTTP/SSE 连接、上游网关、工具过滤与调用二次授权、审计 | 2-3 周 |
| REST-to-MCP | 手动定义、OpenAPI/cURL 导入预览、REST 执行器和静态请求头配置 | 2-3 周 |
| 工作台与 Skills 广场 | 用户工作台接入资料、公开目录、来源管理和安装命令 | 1-2 周 |
| 集成与交付 | SQLite 回归、端到端测试、安全检查、自托管部署与运维文档 | 1-2 周 |

按两名工程师并行估算，首个可交付版本约 **9-12 个日历周**。一名全栈工程师顺序完成约 **16-22 周**。技术验证后，应根据导入范围、Skills 上游格式和实际团队投入重新估算。

## 开工前需要收敛的规格

2026-11-22 补充：MCP/REST 输入、协议、凭证、网络边界、导入规则与审计取舍已汇总至 [接入规格](20261122-mcp-rest-integration.md)，整体待确认。本轮选择原生 MCP 与 REST 同轮交付，分步实施；下列清单及上方周期表保留其原始规划语境，Skills 的独立事项仍属后续阶段。

- OpenAPI 文档的输入形式、`$ref` 支持范围、导入冲突和更新规则。
- cURL 导入的支持子集、预览与错误提示行为。
- Skills 展示字段、GitHub 来源刷新方式和安装命令格式。
- 静态下游密钥的加密密钥管理、目标 URL 的 SSRF 防护，以及审计记录保留周期。

## 决策修订记录

2026-11-21 修订：以下旧决策由当前 SQLite 阶段决策取代，旧文原文保留如下：

- “首期默认 SQLite；同时从首版支持 PostgreSQL。”
- “CI 至少对 SQLite 和 PostgreSQL 各运行一次数据库集成测试。”
- “首期使用 Docker Compose 部署应用和可选 PostgreSQL。”
- “双数据库回归”作为首期集成交付要求。

当前阶段只实现和测试 SQLite；PostgreSQL 的正式支持与验证留待后续选型。
