# 后端目录标准化

## 范围与依据

2026-11-23，用户要求从 `main` 创建 worktree，整理后端代码目录。基线为 `a0884d3`，工作分支为 `dev_backend_structure_261123`，worktree 为相邻目录 `agent-capability-hub-backend-structure`。本轮不合入或推送，完成后等待用户确认。

延续 [技术选型](20261121-technology-selection.md) 的 Express 模块化单体。此次只调整文件归属、导入路径与已有代码的职责归位，保持 HTTP/MCP 行为、数据库结构和迁移名称、环境变量、启动及管理员密码恢复命令不变。

## 目录约定

```text
apps/api/
  src/
    index.ts                 # 进程启动与关闭
    app.ts                   # Express 中间件、模块装配与生命周期
    config/                  # 环境加载、资源预算
    database/
      client.ts              # SQLite/Kysely 连接
      schema.ts              # 数据库表类型
      initialize.ts          # 迁移执行、初始管理员及示例资源
      migrations/            # 原有五次迁移，注册名称与顺序保持不变
    modules/
      auth/                  # 会话、密码、API Key 身份解析与认证路由
      users/                 # 用户管理路由
      roles/                 # 角色管理路由
      api-keys/              # 用户 API Key 管理路由
      resources/             # 资源目录及角色授权路由
      services/              # 服务配置、管理路由及下游凭证解析
      tools/                 # 工具目录、编辑、试调用与统一执行
      audit/                 # 正式调用记录、审计查询和用户统计
      mcp/                   # 上游出口、下游连接、目录同步及协议校验
      rest/                  # REST 定义、序列化、执行和工具登记
      imports/
        curl/                # cURL 词法及转换
        openapi/             # OpenAPI 转换及 schema 处理
    shared/http/             # 与业务无关的 HTTP 大小限制读写
    scripts/                 # 运维命令
  test/
    auth/                    # 登录、用户、角色和 Key 生命周期
    resources/               # 能力目录及授权过滤
    deployment/              # 健康检查及进程启动
    services/                # 服务登记、配置和工具管理
    audit/                   # 审计故障行为
    mcp/                     # MCP 公共协议与下游网络行为
    rest/                    # REST 执行及映射行为
    imports/                 # OpenAPI/cURL 导入及重导入
    fixtures/                # 各测试组共用的数据库、网络服务和文档夹具
```

业务模块内主路由统一为 `routes.ts`；协议入口为 `gateway.ts`，其他文件使用职责名。文件名使用 kebab-case，模块之间直接使用明确的相对导入，不引入路径别名、兼容转发文件或批量再导出入口。

数据库连接、表类型、迁移及初始化归数据库目录；业务 SQL 仍保留当前 Kysely 使用方式，不扩展成新的仓储层。`app.ts` 中的认证、用户和角色处理迁入对应模块，保留原处理逻辑和注册顺序。测试按能力归组，不拆改现有行为断言，共用夹具保持集中。

## 迁移步骤与验收

1. 运行原有后端测试及类型检查，建立迁移前基线。
2. 归位业务、配置、HTTP 公共代码、数据库和运维脚本，验证后端测试与类型检查。
3. 将账户路由从应用装配中提取，验证认证和授权公共 API，再运行后端回归。
4. 归组测试，更新夹具、文件及子进程相对路径，完成后端测试、浏览器端到端测试、类型检查和构建；检查生产文件行数及原 worktree 未修改。

沿用 [已确认的公共测试边界](20261122-mcp-tdd-boundaries.md)，验证真实 HTTP/MCP 和下游网络行为。没有新增产品行为，不增加依赖内部目录结构的测试；本轮采用重构前后现有测试保持通过的验证方式。

目录加深时需同步检查 `.env` 相对定位、TypeScript ESM 的 `.js` 导入、CLI 脚本入口、测试 fixture URL 和进程工作目录。构建及测试进程退出后清理测试资源。验证日志和开发脚本归入 `dev-artifacts/backend-structure-20261123/` 并提交。

## 执行记录

待完成后补充验证结果与提交记录。
