# 前端控制台全量审计与可执行整改规格（v4）

## 状态与使用说明

- **记录日期**：2026-11-24（v4：对齐统一管理架构并收敛全部设计取舍后的可执行完整规格）
- **当前状态**：已确认并开始在 `dev_web_ui_polish_261124` 分支分阶段实施
- **基线提交**：`a8f69ca`（`main` / `origin/main`）
- **核心目标**：解决当前控制台「线框原型感、大屏留白、排版错位、交互反人类、高危零确认、状态竞态、假分页与缺失计数」等系统性问题，交付一套**交互流畅、排版有序、视觉克制精致、工程健壮**的现代开发者控制台。
- **与其他规格的取代与兼容关系**：
  - **视觉体系**：正式取代 [统一管理规格](20261123-unified-mcp-management.md) 中「沿用现有 Swiss editorial 视觉样式（暖纸 `#FAF9F6` + 赤陶橙 `#D9480F` + 2–6px 圆角）」的旧约定，改为现代冷灰极简开发者控制台体系；**完全保留**该文档确立的单一「MCP 服务」一级菜单、接入方式先行选择、接入后不可修改 `kind`、既有 REST 服务重导入及多目标导航流程。
  - **审计字段**：经用户确认，本规格通过数据库迁移在 `audit` 表新增 `durationMs`（毫秒耗时，仅终态写入），正式修订 [MCP 与 REST 接入规格](20261122-mcp-rest-integration.md) 中「不增加耗时字段」的旧条款；**仍严禁**记录 `errorMessage`、HTTP 状态码、请求 ID、IP 或参数/结果正文。
  - **API Key 安全红线**：继续严守 [管理员认证与首个业务阶段规格](20261121-admin-auth-and-first-business-loop.md)，创建 API Key 时有效期**初始不预选任何默认值**。

---

## 一、设计原则与量化排版规范（硬约束）

### 1.1 视觉与美学基线

1. **表面层级与景深（禁止 1px 框套娃）**
   - 拉开画布与卡片对比度，使用轻微投影替代多重嵌套边框：
     - `--bg-canvas: #F5F6F8`（冷灰画布；同步更新 `apps/web/index.html` 中 `<meta name="theme-color" content="#F5F6F8" />`）
     - `--bg-surface: #FFFFFF`（主卡片/表格/弹窗表面）
     - `--bg-subtle: #EEF0F4`（表头、次级区块、分段底槽）
     - `--bg-hover: #E6E9EF`（轻量 hover 反馈）
   - 4 级阴影令牌：
     - `--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04)`
     - `--shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`
     - `--shadow-md: 0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 2px 6px -1px rgba(15, 23, 42, 0.05)`
     - `--shadow-lg: 0 20px 48px -12px rgba(15, 23, 42, 0.18)`
   - 禁止在卡片内部再套带 1px 边线的子卡片（改用轻量底色分区或 `1px` 分割线）。
2. **主色与语义色解耦 + WCAG AA 对比度达标**
   - 主按钮采用深墨黑（`#18181B`，hover `#27272A`），聚焦/选中强调色采用低饱和靛蓝（`#2563EB` / soft `#EFF6FF`），与告警红（`#DC2626`）彻底拉开色相。
   - 文字层级保证在 `#FFFFFF`、`#F5F6F8`、`#EEF0F4` 全表面均满足 WCAG AA（≥ 4.5:1）：
     - `--text-primary: #111827`
     - `--text-secondary: #4B5563`
     - `--text-tertiary: #5B6270`（替换对比度不足的 `#8D8982` 与在浅灰底低于 4.5:1 的 `#6B7280`，在 `#EEF0F4` 上实测对比度 > 5.3:1）
   - 语义状态色：`ok`（绿 `#15803D` / `#F0FDF4`）、`warn`（琥珀 `#B45309` / `#FFFBEB`）、`err`（红 `#B91C1C` / `#FEF2F2`）、`info`（蓝 `#1D4ED8` / `#EFF6FF`）。
3. **字体、排版阶梯与圆角**
   - 引入离线自托管可变字体 `@fontsource-variable/inter` 与 `@fontsource-variable/jetbrains-mono`；禁止对纯中文导航分组名使用等宽字体；移除 `font-synthesis: none`。
   - 严格字号与行高阶梯（消除原 `h3(13px) < body(14px)` 倒挂）：
     - `H1`：`22px` / `line-height: 1.3` / `font-weight: 600` / `letter-spacing: -0.02em`
     - `H2`：`16px` / `line-height: 1.35` / `font-weight: 600`
     - `H3`：`14px` / `line-height: 1.4` / `font-weight: 600`
     - `Body`：`14px` / `line-height: 1.55` / `font-weight: 400`
     - `Caption`：`12px` / `line-height: 1.5` / `font-weight: 500`
     - 数值、时间戳、耗时、ID、命名空间、工具名统一使用等宽字体 + `font-variant-numeric: tabular-nums`。
   - 圆角梯度：`--radius-sm: 6px`、`--radius-md: 10px`、`--radius-lg: 14px`、`--radius-full: 9999px`。
4. **砍掉冗余装饰**
   - 全部移除 `00`~`07` 编号眉标、概览页 `RUNTIME` / `USAGE` 装饰英文词及 `01/02/03` 编号列。

### 1.2 控件标尺、间距栅格与布局骨架

1. **间距栅格（4px 基准，主节奏 8px）**：
   - 元素内紧密间距 `6px–8px`；表单项间距 `16px`；卡片内边距 `20px`；区块垂直间距 `24px`；页面内容区内边距桌面端统一为 `24px 32px 56px`。
2. **全站控件 3 档硬高度**：
   - `sm = 30px`：表格行内操作按钮、紧凑图标按钮、小型标签切换；
   - `md = 36px`：**全站统一标准**——常规 `Button`、`Input`、`Select`、`SearchInput`、`IconButton`、`SegmentedControl` 严格 `height: 36px`；
   - `lg = 40px`：登录页输入框与提交按钮。
   - **图标 3 档尺寸**：行内小图标 `14px`、常规按钮/导航图标 `16px`、品牌/空态大图标 `20px`（`strokeWidth={1.75}`）。
3. **页面标准骨架（全站 6 个工作区视图：`overview` / `services` / `audit` / `users` / `roles` / `keys`，无独立 REST 导入菜单）**：
   - **左侧栏**：固定宽 `232px`（`sticky; top: 0; height: 100vh`），品牌区 + 分组导航（带 `aria-current="page"`）+ 底部真实健康状态指示（与 `OverviewPage` 共享 `/api/health` 状态，失败变红）。
   - **顶栏（Sticky Topbar）**：`height: 52px; position: sticky; top: 0; z-index: 30; backdrop-filter: blur(8px)`，左侧上下文面包屑（如 `用户 / alice / API Keys`），右侧用户角色微标 + 账号下拉菜单（含「修改密码」弹窗入口与「退出」）。
   - **主内容容器**：`.page-content` 为 `width: 100%; max-width: 1360px; margin: 0 auto; padding: 24px 32px 56px;`。
   - **统一页头 `PageHeader`**：左侧「`<h1>` 标题 + 副标题」，右侧次按钮 + 主 CTA 按钮，底部留白 `20px`。
   - **统一筛选工具栏 `FilterToolbar`**：左起 `SearchInput` + 筛选器，右起数量统计与快捷操作，严格 `36px` 等高且 `flex-wrap: wrap`。
4. **响应式断点严格统一为 2 档**：
   - `<= 1024px`：折叠双栏布局（角色授权双栏、试调用 Modal 左右栏、表单双列、登录页左右栏并置表单在前）为单列，杜绝窄列挤压；
   - `<= 768px`：侧边栏收起为顶栏汉堡按钮触发的**左侧滑出抽屉**，主内容内边距缩至 `16px 16px 40px`。

---

## 二、交互流畅度与工程底座规范

### 2.1 动效与零布局抖动（Zero CLS）

- **统一过渡与微动效**（尊重 `@media (prefers-reduced-motion: reduce)`）：
  - 按钮/导航/表格行/卡片 hover `150ms ease`；按压态 `:active:not(:disabled) { transform: scale(0.98); }`；
  - 全局焦点环 `:focus-visible { outline: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(37, 99, 235, 0.35); }`；
  - Modal 遮罩 `150ms`、面板 `180ms cubic-bezier(0.16, 1, 0.3, 1)` 缩放上浮；Drawer 遮罩 `180ms`、抽屉 `220ms` 滑入；
  - 刷新按钮请求期间 `disabled` + 连续旋转；`running` 状态点温和呼吸脉冲。
- **Zero CLS 硬规则**：
  - 禁止在横向工具栏动态插拔新表单控件；禁止在列表底部追加隐蔽大面板；
  - 弹层打开时锁定 `body` 滚动并补偿滚动条宽度；
  - 首次加载使用 `Skeleton` 或加载行，禁止首帧闪现“暂无数据”或红灯。

### 2.2 键盘、防呆、路由与错误处理

1. **弹层键盘与焦点规则**：
   - Modal / Drawer / ConfirmDialog 支持 `Esc` 关闭（异步执行中禁关）、Focus Trap、关闭后焦点归位；
   - 表单弹窗支持 `Enter` 提交，JSON/调试弹窗支持 `⌘/Ctrl + Enter` 执行；
   - `SecretDialog(kind="password")` 必须警示不可再次查看，且**禁止点击遮罩关闭**。
2. **统一反馈分层**：
   - **全局 Toast**：`<Toaster />` 必须挂载在 **`App` 根层**（位于登录态边界之外），确保修改密码退出登录后仍可看到成功提示；控制 `role="status"` 唯一性，避免多个状态节点触发测试/读屏冲突。
   - **字段错误**：就近展示在对应输入下方（中文），重新编辑即清除。
   - **页面错误**：展示带「重试」按钮的错误卡。
   - **后端英文错误中文映射**（`src/lib/api.ts`）：支持**精确匹配 + 前缀/模式匹配**（如 `/^Preview is stale/` 同时覆盖 `Preview is stale; synchronize again` 与 `Preview is stale; import again`；涵盖登录失败、用户名/角色/命名空间冲突、角色占用、停用用户建 Key、旧密码错误、409/413/502 等），兜底保留原文。
3. **竞态、防连点与脏状态保护**：
   - 所有依赖 `id` / `offset` / 筛选参数的 `useEffect` 接入 `AbortController`；
   - 异步写按钮绑定各自独立 `busy` 态（不得在列表/预览/确认之间共用同一 `busy`）；
   - 角色授权未保存或 REST 导入有编辑草稿时，切换目标/退出前弹确认拦截。
4. **Hash 路由与 401 拦截**：
   - **Hash 路由表**（零静态托管配置依赖，刷新不 404）：
     - `#/overview`（默认根路径 `#/` / 空 hash 自动规整至此）
     - `#/services`
     - `#/audit`
     - `#/users`
     - `#/roles`
     - `#/keys`（当前登录用户的 Keys）
     - `#/users/:userId/keys`（管理员代管指定用户 Keys，刷新保留上下文）
   - 权限守卫：普通用户访问仅管理员路由时静默重定向至 `#/overview`；切页自动 `window.scrollTo(0, 0)` 并更新 `document.title`。
   - **全局 401 拦截**：`api()` 收到 401 时触发全局登出重置回调，**但显式排除 `/api/auth/login` 与 `/api/auth/me`**（防止登录输错密码或初始鉴权探测触发重置吞掉错误文案）。登出/改密时清空 `user / reveal / error` 并重置路由状态。
   - **剪贴板降级与 JSON 校验**：`src/lib/clipboard.ts`（HTTPS `navigator.clipboard` + HTTP `textarea + execCommand("copy")` 降级 + Toast）；`src/lib/json.ts`（返回带上下文的中文错误）。

---

## 三、核心组件基座与依赖选型（`apps/web/src/components/ui/`）

已正式选定：**Tailwind CSS v4（`@tailwindcss/vite`）+ Radix UI Primitives（`@radix-ui/react-dialog`、`@radix-ui/react-select`、`@radix-ui/react-switch`、`@radix-ui/react-dropdown-menu`、`@radix-ui/react-tooltip`、`@radix-ui/react-popover`）+ `sonner` + `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`**。

| 组件 | 核心职责 | 替代的旧问题实现 |
| --- | --- | --- |
| `Button` / `IconButton` | `sm(30)/md(36)/lg(40)` 高度、`primary/secondary/ghost/danger`、内置 `loading` | 6 套不齐按钮、无防连点 |
| `Input` / `Textarea` / `PasswordInput` / `SearchInput` | 36px 高度、焦点环、密码显隐、搜索一键清空 | 耦合样式、缺显隐与清除 |
| `Select` / `SegmentedControl` | Radix Select Portal 弹出防裁切 + 36px 分段控制 | 原生 `<select>` 高度错落 |
| `Switch` | Radix Switch 启停开关 | 悬空错位裸 checkbox |
| `Modal` / `Drawer` | Radix Dialog；Drawer 统一 3 档宽：`640px`（普通）/ `760px`（服务详情）/ `min(92vw, 920px)`（导入与接入向导） | 左窄右空 Split + 整页替换 |
| `ConfirmDialog` | 高危/警告二次确认（高亮实体 + 副作用列表 + 独立 `busy`） | `window.confirm` 与零确认 |
| `SecretDialog` | `kind: "password" \| "api-key"`：初始密码标红警示不可复查且禁点遮罩关闭 | 对哈希密码谎称可再次复制 |
| `Badge` / `Tag` / `EmptyState` / `Skeleton` | 胶囊状态、角色标签、空态 CTA、骨架屏 | 2px 方块、首帧闪空 |
| `CopyButton` / `Toaster` | 带 HTTP 降级复制 + 根层挂载 `sonner` | HTTP 报错崩溃、跳登录丢 Toast |

---

## 四、逐页详细整改规格

### 4.1 MCP 服务与工具目录（全弹层方案，唯一服务入口）

1. **主列表 — 响应式多列卡片网格（`ServicesPage` + `ServiceCard`）**：
   - `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;`。
   - 工具栏：`SearchInput`（名/命名空间/URL/描述）+ 协议 `SegmentedControl`（`全部 / 原生 MCP / REST API`）+ 状态 `Select`（`全部 / 已启用 / 未启用 / 异常`）+ 刷新 + `+ 接入服务`。
   - 单卡 4 层排版（点击卡片任意空白区域打开右侧 `ServiceDrawer`，Switch 与 `···` 菜单阻止事件冒泡）：
     1. 头部：服务名（单行省略）+ `原生 MCP` / `REST API` 徽标 + 启用 `Switch`；
     2. 技术行：`namespace`（mono）· 传输（仅 MCP 显示 `HTTP / SSE`）+ URL 单行省略；
     3. 说明行：`description` 2 行截断等高对齐；
     4. 底栏：工具数 `toolCount` + 连接状态胶囊（**REST 显示「配置有效」或未启用，绝不显示「已连接」**）+ 「查看工具」与 `···` 菜单（按 `kind` 区分：原生 MCP 含 `编辑 / 测试连接 / 同步工具 / 删除`；REST 含 `编辑 / 导入工具 / 删除`）。
   - **持久多目标结果导航条**：当 OpenAPI 多目标导入保存 ≥2 个服务时，页面顶部展示可关闭的持久提示条（`role="status"`），含各服务的 `查看 <name>` 按钮（切页或重开抽屉），**不用 3 秒自动消失的 Toast 替代**。任意保存或导入完成后**自动打开首个目标服务的 `ServiceDrawer`**。
2. **服务详情与工具目录 — 右侧大抽屉（`ServiceDrawer`，`760px`）**：
   - 吸顶头：服务名 + 启停 `Switch` + 状态徽标 + 关闭按钮；元信息条（接入方式、命名空间、传输、超时、已配请求头数、可复制 URL、服务说明）；
   - 动作条：按 `kind` 严格区分——原生 MCP 显示 `同步工具`、`测试连接`、`编辑服务`、`··· → 删除服务`；REST 显示 `导入工具`、`定义 REST 工具`、`编辑服务`、`··· → 删除服务`。测试连接成功弹 Toast 展示 `serverInfo`。
   - **工具目录主体**：标题 `工具目录 (N)` + 工具搜索框；工具卡片头部严格采用 **左 `flex: 1; min-width: 0` + 右 `.tool-actions { flex-shrink: 0; flex-wrap: nowrap; gap: 6px }`**，长描述默认 2 行截断可展开，保证按钮在任意宽度和描述长度下绝不折行错位；REST 工具前置彩色 Method 徽章 + mono `path`（基于强类型 `RestMapping`）；参数区默认折叠显示 `N 个参数 · M 个必填`，展开可切 `结构化参数表 | 原始 JSON Schema`；删除走 `ConfirmDialog`。
3. **编辑既有服务 — 居中 Modal（`ServiceEditorModal`，`640px`，`key={initial.id}`）**：
   - `kind` 仅只读展示（禁止切换类型）；
   - 超时使用受控字符串 `timeoutInput` + 快捷预设 `15/30/60/120s`，允许任意正数（含小数秒），解决清空跳 `0` 问题同时兼容通过 API 保存的小数超时；
   - 请求头提供「KV 键值编辑器（含密文遮罩眼睛、常用鉴权模板）| JSON」双 Tab；
   - 改命名空间命中工具重命名时，弹窗内切至警示确认视图（列表限高 `220px` 滚动，提示连接参数变更将重置现有连接）。
4. **服务接入与工具导入 — 超宽右侧抽屉（`min(92vw, 920px)`，承载 `ServiceOnboarding`）**：
   - 绑定 `key={target?.id ?? `new-${sessionKey}`}`，每次从「接入服务」进入确保状态完全重置（空原文、未选接入方式、预览默认新建）。
   - 若为全新接入（无 `target`），先选择「原生 MCP」或「REST API」；选「REST API」后再选「手工定义 / OpenAPI / cURL」。选择「原生 MCP」或「REST 手工定义」时，在抽屉内渲染新建表单；选择「OpenAPI / cURL」或从既有 REST 服务点「导入工具」进入时，渲染拆分后的 `ImportSourceForm` + `ImportTargetGroupCard`：
     - 错误/成功提示置顶并定位至具体服务组与操作行；
     - **解绑 `<details open={operation.checked}>`**，操作行默认折叠，点击「编辑定义」按需展开/抽屉编辑；增加操作汇总条、`全选可转换 / 仅选新增与修改 / 清空` 及搜索；
     - 切换「保存方式」或导入来源若有已编辑草稿，**先弹脏态确认**；若确认在保留草稿前提下刷新预览，必须按 `(group.url, operation.label)` 匹配（后端每次预览都会重生成 `operation.id` UUID）；
     - 拆分 `busyPreview` 与 `busyConfirm` 独立状态；文件上传改为 Dropzone 并修复切换输入方式残留；按 OpenAPI / cURL 动态切提示语；底部吸底确认栏。
5. **独立二级 Modal（支持在 `ServiceDrawer` 之上安全叠加，Esc 仅关闭最顶层）**：
   - **试调用 Modal（`ToolTestModal`，`860px` 左右分栏）**：左栏提供「表单填参 | JSON 参数（实时校验/格式化/填示例）」；表单填参覆盖常见平铺标量与 REST `path/query/headers` 分组（**未填可选字段不发空串/null，保留显式输入的 `"" / 0 / false / null`**），遇到 `oneOf/anyOf`/多层嵌套或递归 `$ref` 自动降级并提示切换至 JSON Tab；右栏清晰区分成功与 `result.isError: true`、显示客户端耗时（ms）、复制按钮与「友好预览 | 原始 JSON（保留 `data-testid="tool-result"`）」。
   - **REST 工具编辑 Modal（`RestToolModal`，`680px`）**：提供「基础可视化表单 | JSON 定义」双向切换，切换回表单或保存时**无损透传 `schemaDefs` 等高级字段**；若检测到表单未覆盖的复杂 Schema，明确锁为 JSON Tab 防静默丢约束。
   - **同步差异 Modal（`SyncPreviewModal`，`760px`）**：`added + modified + deleted === 0` 时不弹窗直接 Toast「已是最新」；有变更按 `+新增 / ~更新 / -删除` 分类，删除前置红警，更新剥离 `serviceId` 噪音并展示前后对比，409 过期提供一键「重新检测差异」。

### 4.2 用户管理（`UsersPage`）

- 移除顶部 `.inline-create`；页头右置刷新 + `+ 新建用户`；无自定义角色时顶部展示轻引导条 + 前往 `#/roles`。
- `User` 类型补全 `createdAt`；组件接收 `currentUserId` 渲染「当前登录」微标。
- 工具栏：`SearchInput`（账号）+ 状态 `SegmentedControl`（全部 / 启用 / 停用）+ 角色 `Select` + 人数统计。
- 表格列：`账号` | `角色` | `状态` | `创建时间`（`createdAt` mono）| `操作`（`调整角色`、`Keys`、`重置密码`、`停用/启用`）。
- **新建用户 Modal**（强制 ≥1 角色）→ 成功后切至 `SecretDialog(kind="password")`（红警不可复查、禁点遮罩关闭）；**调整角色 Modal**取代被裁切的 `<details>`；停用与重置密码走 `ConfirmDialog`。

### 4.3 角色与授权（`RolesPage`）

- 移除顶部创建框，页头右置 `+ 新建角色` Modal（创建后自动选中）。
- 双栏布局（左 `240px` + 右 `1fr`，**严禁 `overflow: hidden`**）：
  - 左侧：角色搜索 + 角色列表，直接展示 `grantCount` 与 `userCount`（来自增强后的 `GET /api/admin/roles`）。
  - 右侧吸顶头：角色名 + 统计 + 工具搜索 + `仅看已授权` 开关 + `全部展开/折叠` + `删除角色`（`ConfirmDialog(danger)`，若 `userCount > 0` 提前禁用或提示需先移除用户分配）。
  - **按服务分组的树形折叠卡片**（结合 `parentId` 与 `/api/admin/services`）：头显服务名、`原生 MCP / REST API`、启停态、`X / Y`、快捷 `全选工具 / 清空`。目录授权语义显式处理：当勾选 ≥1 工具时显示只读 `目录自动可见`；当从 ≥1 工具取消至 0 工具时，自动清除多余的 `service.id` 授权（避免隐式残留空目录可见权），如需仅开放空目录由次级开关单独显式控制。`Skills` 拆为「受限技能」与「公开技能（默认折叠只读说明）」。
  - 脏态吸底保存栏、切角色/刷新脏态确认、`AbortController`、失败重试卡（绝不清零 `grants`）、保存 Toast。

### 4.4 API Keys（`KeysPage`）

- **代管上下文条**（路由 `#/users/:userId/keys`）：页头提供 `← 返回用户列表` 与 `切换回我的 Keys`，面包屑 `用户 / <username> / API Keys`；等待目标用户信息加载完成后展示真实用户名防闪烁；目标用户停用时禁用 `+ 创建 Key` 并提示原因。
- **创建与筛选解耦**：
  - `+ 创建 Key` → 居中纵向 Modal（名称 + 有效期预设胶囊 `30 天 / 90 天 / 1 年 / 永久 / 自定义日期`——**初始必须全部未选中**，未选提交展示字段级中文校验提示；选自定义日期在纵向流展开 `datetime-local` 且校验 `min` 未来时间 → 成功后弹 `SecretDialog(kind="api-key")`）。
  - 表格上方独立 `36px` `FilterToolbar`：`SearchInput`（名称）+ 状态 `SegmentedControl`（全部 / 有效 / 已过期 / 已吊销 含计数）。
- 表格列：`名称` | `凭证`（脱敏显示 + 有效 Key 一键直复 `CopyButton` + 明文弹窗图标）| `创建时间` | `有效期`（≤7 天 `badge-warn` 提醒）| `状态`（已吊销悬停/附注吊销时间）| `操作`（有效 Key `吊销` → `ConfirmDialog(danger)`）。

### 4.5 登录页、概览页与调用审计

1. **登录页（`LoginPage`）**：修复 `.login-brand span` 样式泄漏到 `.brand-icon`；右侧表单标题改 `<h2>`；`<= 1024px` 断点 `order: -1` 将表单置顶；补 `autoFocus`、密码显隐、提交前 `trim()`、中文错误条，移除虚假静态绿点。
2. **概览页（`OverviewPage` + `UsageCard`）**：
   - 修复 `activeKeyCount` 排除已过期 Key；健康状态区分 `loading / ok / error` 三态并与 `AppShell` 共享状态；刷新按钮加 `disabled` + 旋转 + `AbortController`；
   - 低频「修改密码」移入顶栏账号下拉菜单弹窗（确认新密码、显隐、独立 loading、成功后退出并重置路由，Root `<Toaster />` 弹出成功提示）；
   - MCP 接入区提供已验证客户端片段切换：**Claude Code（CLI 命令 + `.mcp.json`）| Codex（CLI 命令 + `.codex/config.toml` TOML）| 通用 HTTP**（不编造未核验客户端格式）；
   - 管理员视图补充平台汇总卡（服务总计/启用数、自定义角色数、用户数，附快捷跳转）。
3. **调用审计页（`AuditPage`）**：
   - 修复翻页失败 `offset` 回滚（仅响应成功更新展示页码与数据，或失败保持旧列表）、`AbortController`、翻页回顶、刷新动画；
   - 接入服务端筛选工具栏：`SearchInput`（用户/服务/工具/客户端）+ 状态 `Select`（全部/成功/失败/进行中/结果未知）+ 每页条数 `Select`（`20 / 50 / 100`）；使用服务端返回 `total / hasMore` 彻底根治末页恰好整百条出现空下一页的问题；
   - 表格增补 `耗时` 列（`durationMs` 格式化展示 `12 ms` / `1.24 s`，运行中/未知显示 `—`），`时间` 列 `white-space: nowrap`（hover 展示完整毫秒时间），`工具` 与 `客户端` 截断 + tooltip + 复制，`running` 脉动动效，`unknown` 悬停解释。

---

## 五、前后端接口增强与工程交付约束

### 5.1 文件规模与目录规划（严守 `AGENTS.md`）

- 除测试外，单个生产文件物理行数 **≤ 500 行**（绝不超过 700 行）。
- 推荐前端结构：
  - `apps/web/src/lib/`：`api.ts`（401 排除登录/探测路径 + 中文错误映射）、`router.ts`（Hash 路由）、`json.ts`、`clipboard.ts`、`schemaForm.ts`
  - `apps/web/src/hooks/`：`useAbortableRequest.ts`、`useHealth.ts`
  - `apps/web/src/components/ui/`：Tailwind + Radix 原语组件与 `Toaster`
  - `apps/web/src/components/layout/`：`AppShell.tsx`、`PageHeader.tsx`、`FilterToolbar.tsx`
  - `apps/web/src/components/domain/`：业务弹窗/抽屉/卡片拆分子组件

### 5.2 后端增强契约（TDD 先行，零破坏性）

1. **`GET /api/admin/services` 与 `GET /api/admin/services/:id`**：返回对象补充 `toolCount: number`（分组统计 `tools` 表已确认工具数，`POST /api/admin/services` 默认 `0`）。
2. **`GET /api/admin/roles`**：每个角色补充 `userCount: number` 与 `grantCount: number`（分别分组统计 `user_roles` 与 `role_resources`）。
3. **`audit` 迁移与 `GET /api/admin/audit`**：
   - 新增迁移 `006-audit-duration.ts`，为 `audit` 表增加可空整型列 `durationMs`；`finishAudit` 写入毫秒级耗时（≥ 0）；`running` 与重启置 `unknown` 保持 `null`；**严禁增加 `errorMessage` 或载荷字段**。
   - `GET /api/admin/audit` 支持 `offset`（≥ 0）、`limit`（默认 100，钳制 `1..100`）、`status`（`running | succeeded | failed | unknown`）、`q`（对 `username`、`serviceName`、`toolName`、`clientName` 做大小写不敏感子串过滤），返回 `{ records, total, hasMore }`。

### 5.3 分阶段实施与验收清单

- **Phase 0**：建立需求分支 `dev_web_ui_polish_261124` 并提交 v4 规格修订。
- **Phase 1**：完成后端 TDD 增强（Vitest 公共接口测试 + 迁移 + 计数与审计查询）并提交。
- **Phase 2**：前端底座（Tailwind v4 + Radix + `sonner` + 离线字体 + Hash 路由 + `AppShell` + `ui/` 基座）。
- **Phase 3**：`ServicesPage` 全弹层架构改造（卡片网格 + `ServiceDrawer` + `ServiceEditorModal` + `ServiceOnboarding`/`RestImportForm` 抽屉 + `ToolTestModal`/`RestToolModal`/`SyncPreviewModal`）。
- **Phase 4**：访问控制三页（`UsersPage`、`RolesPage`、`KeysPage`）与其余三页（`LoginPage`、`OverviewPage`、`AuditPage`）。
- **Phase 5**：全部 **7 个** Playwright E2E 同步更新与回归（注意 Radix Select/Switch 替代原生 `<select>`/`checkbox`、顶栏下拉「退出」触发方式、`aria-hidden="true"` 必填星号、持久结果条与单条 `role="status"`、全部 **16 处**导航选择器、保留 `data-testid="tool-result"` / `usage-total` / `usage-successful` / `usage-failed`），以及新增交互验收和 **1920 / 1280 / 900 / 390** 视口截图复验。

**最终验收命令**：`pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm test:e2e` 全部通过后等待用户确认合入 `main`。
