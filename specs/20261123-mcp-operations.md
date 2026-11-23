# MCP 与 REST 接入操作说明

本说明对应 [已确认规格](20261122-mcp-rest-integration.md)，实现和验证记录见 [交付记录](20261123-mcp-delivery.md)。

## 启动与部署

要求 Node.js 24 LTS、pnpm 11。全部 SDK、测试工具与构建工具为项目依赖，不需要全局安装。

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

修改 `.env` 中的管理员账号和密码，再运行：

```sh
pnpm dev
```

开发控制台为 `http://localhost:5173`。Vite 将 `/api` 和 `/mcp` 代理到 API 的 `http://127.0.0.1:3100`。API_PORT 改动时，启动 Vite 前通过环境变量 `ACH_API_TARGET` 设置对应地址。生产构建和启动：

```sh
pnpm build
pnpm --filter @ach/api start
```

生产控制台静态文件位于 `apps/web/dist/`。部署者的 Web 服务应提供这些文件，并把 `/api`、`/mcp` 转发到 API，保持同源；`/mcp` 代理关闭响应缓冲，读超时应大于服务配置的工具超时。TLS、外部可达性和网络路由由部署环境提供。

Nginx 配置片段（替换静态文件的绝对路径及部署监听配置）：

```nginx
server {
    listen 8080;
    root /absolute/path/agent-capability-hub/apps/web/dist;

    location /api/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
    }
    location = /mcp {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

| 配置 | 默认值 / 用途 |
| --- | --- |
| `ADMIN_USERNAME`、`ADMIN_PASSWORD` | 空数据库初始化时必填；已有管理员不会被环境变量覆盖 |
| `API_HOST` | `0.0.0.0`，可改为部署需要的 IPv4/IPv6 地址 |
| `API_PORT` | `3100` |
| `DATABASE_PATH` | API 包工作目录下的 `../../data/agent-capability-hub.sqlite`；建议部署时使用绝对路径 |
| `MCP_ALLOWED_ORIGINS` | 默认空；逗号分隔的允许浏览器 Origin；无 Origin 的请求正常接受 |
| `MCP_MAX_IMPORT_BYTES` | `10485760`，导入原文 10 MiB |
| `MCP_MAX_REQUEST_BYTES` | `10485760`，单次调用请求 10 MiB |
| `MCP_MAX_RESPONSE_BYTES` | `10485760`，单次响应 / SSE 消息事件 10 MiB |
| `MCP_MAX_SCHEMA_DEPTH` | `64`，结构深度 |
| `MCP_MAX_SCHEMA_NODES` | `100000`，节点预算 |

预算配置必须为正整数，超出时明确报错，不截断结果或删除约束。程序不添加上游或下游 IP/网段白名单。Origin 是 MCP 协议入口校验，不是网络可达性配置。

SQLite 保存 API Key 与管理员配置的下游请求头明文；数据库和备份的保护由部署者负责。使用单实例。重启会将无法确认结果的未结束审计标为“结果未知”，不会补执行。SIGINT/SIGTERM 关闭 MCP 连接与数据库。

管理员密码可在 API 所在部署环境执行以下命令重置；新密码显示一次，并退出全部网页会话：

```sh
pnpm --filter @ach/api admin:reset-password
```

## 管理员登记 MCP

1. 在“MCP 服务”登记服务名称、地址、传输方式及静态请求头。命名空间自动建议，可在保存前或以后修改。
2. 使用 Streamable HTTP 或旧 SSE。地址不可达、凭证错误时仍可保存，状态会提示未连接或认证失败。
3. “测试连接”验证连接；“同步工具”读取完整分页并展示新增、修改和删除。审阅后确认，工具才进入已确认目录。
4. “角色与授权”给角色勾选具体工具，再把角色分配给用户。服务目录授权不自动授权子工具，多角色按并集处理。
5. 在工具列表“试调用”填写参数并查看结果。试调用不进入正式审计。

下游请求头示例：

```json
{
  "Authorization": "Bearer downstream-token",
  "X-Api-Key": "downstream-api-key"
}
```

Basic 可填写 `Authorization: Basic <base64(username:password)>`。入站平台 Key 不转发给下游；固定头在出站请求时独立注入，工具参数不能覆盖。当前由管理员配置共享身份，未来用户凭证可通过统一凭证解析入口扩展。

MCP 断线自动退避重连，认证失败提示管理员修正。重连不发布工具变化，不重发调用。未连接和停用的工具不进入可调用列表。每服务默认超时 60 秒，可编辑调整。

同名工具使用 `namespace__originalName`。命名空间保存变更前展示受影响名称；保存后旧名立即失效，没有别名。内部 ID、授权和历史记录保留。工具原名相同的同步更新保留 ID/授权，新工具默认未授权；确认删除会清理授权，以后重现使用新 ID 并需重新授权。发现失败和迟到结果不清空目录；新预览替代同服务旧预览。

服务类型保存后固定；需要从 MCP 改为 REST 或反向迁移时登记新服务。删除服务或工具保留历史审计与统计。

## REST 手工定义与导入

在“MCP 服务”登记 REST 服务，再点击“定义 REST 工具”；或者在“REST 导入”使用 OpenAPI 文本、文件、文档 URL 或粘贴 cURL。

所有导入先预览，管理员编辑参数和可选示例、勾选操作、配置各目标的命名空间与凭证后确认保存。不同有效 server URL 分组保存为不同 REST 服务，不自动复用凭证。不支持的操作展示原因且不可选。

OpenAPI 支持 3.0.x/3.1.x 和 JSON/YAML；Swagger 2.0 不支持。文档 URL 的最终重定向地址作为相对 server 的基址，粘贴或文件可另填基址。不自动获取外部 `$ref`；内部 JSON Pointer、静态 `$anchor` 与递归引用转换成自包含本地定义。默认 OAS 3.1 方言和显式 JSON Schema 2020-12 可用；无法支持的方言、必需 vocabulary、`$id` 作用域和动态引用明确提示不支持。

cURL 只解析单条请求，不运行 shell，也不读取文件、环境变量、`@file`、命令替换或串联命令。query/header 初始按字符串推断，JSON body 按样例推断；不把 `/users/42` 自动变成路径模板。管理员可在预览中改类型、必填项、路径模板、schema、示例。固定凭证单独保存。

手工定义例子：

```json
{
  "name": "update-user",
  "description": "更新用户",
  "method": "PATCH",
  "path": "/users/{id}",
  "parameters": [
    {"in": "path", "name": "id", "schema": {"type": "string"}, "required": true},
    {"in": "query", "name": "tags", "schema": {"type": "array", "items": {"type": "string"}}, "style": "form", "explode": true},
    {"in": "header", "name": "X-Tenant", "schema": {"type": "string"}}
  ],
  "bodySchema": {"type": "object", "properties": {"active": {"type": "boolean"}}, "required": ["active"]},
  "bodyRequired": true,
  "bodyContentType": "application/json",
  "example": {"path": {"id": "42"}, "body": {"active": false}}
}
```

MCP 调用参数：

```json
{
  "path": {"id": "42"},
  "query": {"tags": ["one", "two"]},
  "headers": {"X-Tenant": "team-a"},
  "body": {"active": false}
}
```

无参数的组可省略。path/header 仅标量；query 支持标量和 form 标量数组，explode=true 使用重复键，false 使用逗号列表。对象参数、其他 style、cookie 参数不支持。JSON body 内对象/数组可用，GET/HEAD 不发送 JSON body。省略可选 body 时不发送空对象；`example` 仅用于试调用预填，schema `default` 不补正式参数。路径参数独立编码；`.`/`..` 独立路径段会明确拒绝，避免 URL 规范化导致错误路由。

REST 配置有效且启用即可正式调用，不要求成功试调用，不请求业务接口作为健康检查。JSON 媒体类型按声明发送。JSON、文本和空 204 响应原样进入 MCP content；不增加 `{status, body}` 包装。2xx 成功，其他 HTTP 状态 `isError=true`，仍保留响应正文。二进制响应明确不支持。失败、断线或超时不重发，实际失败不永久停用 REST 服务。

重导入在目标分组中选“更新已有服务”。按 HTTP 方法+路径模板匹配，已有工具保留 ID/授权，未选择的旧操作不删除；删除需要明确操作。管理员修改导入定义后仍需通过同一校验。相同服务不能保存重复 HTTP 方法+路径。已有服务目标 URL 需与导入分组一致，换目标前先编辑服务配置。

## 用户 Key 与审计

普通用户登录后创建 API Key；Key 属于用户，所有请求读取当前用户状态、Key 有效性和角色授权。API Key 作为 MCP Bearer 凭证，网页管理 API 使用网页会话。

正式调用成功、失败和拒绝均以已建立审计为统计依据；审计只记录用户、服务、工具、时间、结果状态和可选客户端标签，不保存参数或结果正文。无法建立审计时不发送调用；调用后审计更新失败仍返回实际结果，并独立报告审计故障。

“调用审计”仅管理员可见，每页 100 条。普通用户概览只显示自己全部 Key（包括过期/吊销）的累计总次数、成功数和失败数。进行中和未知只计总数，所以总数可能不等于成功+失败。管理员测试不计入。

停用、Key 吊销及授权变更阻止新调用，已发调用允许完成或超时。主动取消尝试传给下游，不承诺业务回滚。网关成功/失败描述网关调用结果，不保证下游业务是否已产生副作用。

## Claude Code 接入

使用部署实例的 `/mcp` 地址和控制台签发的 Key。当前 CLI 帮助与 [Claude Code 官方文档](https://code.claude.com/docs/en/mcp)已核对：

```sh
claude mcp add --transport http --scope local agent-hub https://hub.example/mcp \
  --header "Authorization: Bearer <platform-api-key>"
```

`local` 为当前项目的本地配置范围。也可在项目 `.mcp.json` 配置环境变量引用，使共享文件不包含具体 Key：

```json
{
  "mcpServers": {
    "agent-hub": {
      "type": "http",
      "url": "https://hub.example/mcp",
      "headers": {"Authorization": "Bearer ${ACH_API_KEY}"}
    }
  }
}
```

启动 Claude Code 的进程环境中提供 `ACH_API_KEY`，在 `/mcp` 查看连接状态。配置的信任/确认流程由客户端处理。服务超时调高时，相应调整客户端工具超时。

## Codex 接入

按 [Codex 官方 MCP 文档](https://developers.openai.com/codex/mcp)及当前 CLI 帮助，可使用：

```sh
codex mcp add agent-hub --url https://hub.example/mcp --bearer-token-env-var ACH_API_KEY
```

这条命令写入 Codex 配置，不是全局安装依赖。也可手工放入可信项目的 `.codex/config.toml`，或个人 `~/.codex/config.toml`：

```toml
[mcp_servers.agent-hub]
url = "https://hub.example/mcp"
bearer_token_env_var = "ACH_API_KEY"
tool_timeout_sec = 70
```

启动 Codex 的进程环境中提供 `ACH_API_KEY`。若平台服务超时大于 60 秒，相应调整 `tool_timeout_sec`；示例的 70 秒为默认平台超时留出传输时间。网关提供静态 Bearer Key 鉴权，不使用 `codex mcp login` 的 OAuth 流程。

网关提供最新 `2026-07-28` 及官方 SDK 的旧版无状态 Streamable HTTP 兼容。这里只代理普通 tools，不声明 resources/prompts、sampling、elicitation 等交互能力；需要未支持交互的调用返回明确原因。旧下游 SSE 会话由客户端适配器管理，只保证独立调用或显式参数 handle 关联状态。验收通过官方 SDK 与受控协议/网络夹具完成，不对每个 Agent 做专项兼容承诺。

官方说明的本次抓取和 CLI 帮助位于 `dev-artifacts/mcp-docs-20261123/`。

## HTTP 管理接口索引

以下管理员接口要求管理员网页会话，普通用户返回 403；变更动作使用 JSON 请求正文。

| 路径 | 行为 |
| --- | --- |
| `GET/POST /api/admin/services` | 服务列表/登记 |
| `GET/PATCH/DELETE /api/admin/services/:id` | 详情/编辑/删除 |
| `POST /api/admin/services/:id/config-preview` | 配置及改名影响预览 |
| `POST /api/admin/services/:id/test-connection` | MCP 连接测试；REST 仅配置报告 |
| `POST /api/admin/services/:id/sync-preview` | 原生工具差异预览 |
| `POST /api/admin/services/:id/sync-confirm` | 使用 previewId 确认目录 |
| `GET/POST /api/admin/services/:id/tools` | 目录/手工 REST 定义 |
| `PATCH/PUT/DELETE /api/admin/services/:id/tools/:toolId` | REST 定义更新/显式删除 |
| `POST /api/admin/services/:id/tools/:toolId/test` | arguments 参数试调用 |
| `POST /api/admin/imports/preview` | kind=openapi/curl，加 text、file={name,content} 或 url；可用 baseUrl、targetServices |
| `POST /api/admin/imports/confirm` | previewId、勾选 groups/operations 和已审阅 definition |
| `GET /api/admin/audit?offset=0` | 全部正式调用明细 |
| `GET /api/usage` | 当前用户自己的累计统计 |
| `/mcp` | 平台 Bearer Key 鉴权的协议出口 |

预览只驻留当前进程，重启后重新生成；服务/目录变更后失效的预览需要重新审阅。示例请求及关键流程可参考 `apps/api/test/`、`apps/web/test/` 中的公共接口测试。
