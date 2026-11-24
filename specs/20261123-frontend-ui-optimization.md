# 前端控制台全量审计与可执行整改规格

## 状态与使用说明

- **记录日期**：2026-11-23（v3：面向后续执行 Agent 的可执行完整规格）
- **当前状态**：规格待执行（**本阶段仅记录，不修改任何源码**；后续执行 Agent 需先从 `origin/main` 切需求分支 `dev_web_ui_polish_<yyMMdd>` 按阶段实施）
- **基线提交**：`ea5db68`（`main`）
- **核心目标**：解决当前控制台「线框原型感、大屏留白、排版错位、交互反人类、高危零确认、状态竞态」等系统性问题，交付一套**交互流畅、排版有序、视觉克制精致、工程健壮**的现代开发者控制台。

---

## 一、设计原则与量化排版规范（给执行 Agent 的硬约束）

### 1.1 视觉与美学基线（告别线框原型）

1. **表面层级与景深（禁止 1px 框套娃）**
   - 拉开画布与卡片对比度，使用轻微投影替代多重嵌套边框：
     - `--bg-canvas: #F5F6F8`（浅中性冷灰画布；若保留暖调则用 `#F4F2ED`）
     - `--bg-surface: #FFFFFF`（主卡片/表格/弹窗表面）
     - `--bg-subtle: #EEF0F4`（表头、次级区块、分段底槽）
     - `--bg-hover: #E6E9EF`（轻量 hover 反馈）
   - 建立 4 级阴影令牌：
     - `--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04)`（按钮、输入框微浮）
     - `--shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`（卡片、表格容器）
     - `--shadow-md: 0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 2px 6px -1px rgba(15, 23, 42, 0.05)`（Dropdown、Popover、Toast）
     - `--shadow-lg: 0 20px 48px -12px rgba(15, 23, 42, 0.18)`（Modal、右侧 Drawer）
   - 禁止在卡片内部再套带 1px 边线的子卡片（使用轻量底色分区或 `1px` 分割线即可）。
2. **主色与语义色解耦 + WCAG AA 对比度达标**
   - 主按钮采用高质感深墨黑（`#18181B`，hover `#27272A`），聚焦/选中强调色采用低饱和靛蓝（`#2563EB` / soft `#EFF6FF`），与告警红（`#DC2626`）彻底拉开色相，杜绝「焦点/强调」与「报错」混淆。
   - 文字层级保证 WCAG AA（≥ 4.5:1）：
     - `--text-primary: #111827`
     - `--text-secondary: #4B5563`
     - `--text-tertiary: #6B7280`（严禁使用原 `#8D8982` 低对比灰）
   - 语义状态色：`ok`（绿 `#15803D` / `#F0FDF4`）、`warn`（琥珀 `#B45309` / `#FFFBEB`）、`err`（红 `#B91C1C` / `#FEF2F2`）、`info`（蓝 `#1D4ED8` / `#EFF6FF`）。
3. **字体、排版阶梯与圆角**
   - 引入离线自托管字体 `@fontsource-variable/inter` 与 `@fontsource-variable/jetbrains-mono`（内网无外网环境也可用）；禁止对纯中文导航分组名使用等宽字体；取消阻断粗体合成的 `font-synthesis: none` 或确保字重文件完整。
   - 严格字号与行高阶梯（消除原 `h3(13px) < body(14px)` 倒挂）：
     - 页面主标题 `H1`：`22px` / `line-height: 1.3` / `font-weight: 600` / `letter-spacing: -0.02em`
     - 区块/弹窗标题 `H2`：`16px` / `line-height: 1.35` / `font-weight: 600`
     - 卡片/分组标题 `H3`：`14px` / `line-height: 1.4` / `font-weight: 600`
     - 正文 `Body`：`14px` / `line-height: 1.55` / `font-weight: 400`
     - 辅助/表格头/元信息 `Caption`：`12px` / `line-height: 1.5` / `font-weight: 500`
     - 数值、时间戳、ID、命名空间、工具名统一使用等宽字体 + `font-variant-numeric: tabular-nums`。
   - 圆角梯度：`--radius-sm: 6px`（按钮/输入框）、`--radius-md: 10px`（卡片/表格/下拉）、`--radius-lg: 14px`（Modal/Drawer）、`--radius-full: 9999px`（状态胶囊 Badge、Switch）。
4. **砍掉冗余装饰**
   - **全部移除** `00`~`07` 编号眉标（如 `07 凭证管理`）及概览页纯装饰英文词（`RUNTIME` / `USAGE`）和 `01/02/03` 编号列。

### 1.2 控件标尺、间距栅格与布局骨架（保证排版绝对有序）

1. **间距栅格（4px 基准，主节奏 8px）**：
   - 元素内紧密间距 `6px–8px`；表单项间距 `16px`；卡片内边距 `20px`；区块垂直间距 `24px`；页面内边距桌面端 `24px 32px 48px`。
2. **全站控件 3 档硬高度（消灭 26/28/30/34/36/38px 参差锯齿）**：
   - `sm = 30px`：表格行内操作按钮、紧凑图标按钮、小型标签切换；
   - `md = 36px`：**全站统一标准**——所有常规 `Button`、`Input`、`Select`、`SearchInput`、`IconButton`、`SegmentedControl` 必须严格 `height: 36px`，保证任意横向工具栏像素级基线对齐；
   - `lg = 40px`：登录页输入框与提交按钮。
   - **图标 3 档尺寸**：行内小图标 `14px`、常规按钮/导航图标 `16px`、品牌/空态大图标 `20px`（`strokeWidth={1.75}`）。
3. **页面标准骨架（全站 7 个工作区页面保持一致节奏）**：
   - **左侧栏**：固定宽 `232px`（`sticky; top: 0; height: 100vh`），品牌区 + 分组导航（带 `aria-current="page"`）+ 底部真实健康状态指示（绑定 `/api/health`，失败变红而非假绿点）。
   - **顶栏（Sticky Topbar）**：`height: 52px; position: sticky; top: 0; z-index: 30; backdrop-filter: blur(8px)`，左侧可点击上下文面包屑（如 `用户 / alice / API Keys`），右侧用户角色微标 + 账号下拉菜单（含「修改密码」弹窗入口与「退出登录」）。
   - **主内容容器**：`.page-content` 改为 `width: 100%; max-width: 1360px; margin: 0 auto; padding: 24px 32px 56px;`——彻底根治 1920px 屏右侧 528px 死白断层。
   - **统一页头 `PageHeader`**：左侧「`<h1>` 标题 + 一行简短副标题」，右侧「次按钮（如刷新）+ 主 CTA 按钮（如 `+ 登记服务` / `+ 新建用户`）」，底部留白 `20px`。
   - **统一筛选工具栏 `FilterToolbar`**（列表页标配）：左起 `SearchInput (260–320px)` + `SegmentedControl / Select` 筛选器，右起数量统计与快捷操作，全部严格 `36px` 等高且 `flex-wrap: wrap` 对齐。
4. **响应式断点统一为 2 档**：
   - `<= 1024px`：提前折叠双栏布局（角色授权双栏、调试弹窗左右栏、表单双列）为单列，杜绝窄列挤压（修复原 `RolesPage` 仅剩 236px 问题）；
   - `<= 768px`：侧边栏收起为顶栏汉堡按钮触发的**左侧滑出抽屉**，主内容内边距缩至 `16px 16px 40px`。

---

## 二、交互流畅度与微交互规范

### 2.1 动效与反馈规范

- **统一过渡与微动效**（同时尊重 `@media (prefers-reduced-motion: reduce)`）：
  - 按钮/导航/表格行/卡片 hover：`transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, color 150ms ease`；
  - 按钮按压态：`:active:not(:disabled) { transform: scale(0.98); }`；
  - 焦点环：全站统一 `:focus-visible { outline: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(37, 99, 235, 0.35); }`；
  - 居中 Modal：遮罩 `150ms` 淡入，面板 `180ms cubic-bezier(0.16, 1, 0.3, 1)` 轻微缩放上浮（`0.96 → 1`）；
  - 右侧 Drawer：遮罩 `180ms` 淡入，抽屉 `220ms cubic-bezier(0.16, 1, 0.3, 1)` 从右侧滑入（`translateX(100%) → 0`）；
  - 刷新按钮：请求期间 `disabled` + 图标连续旋转（`@keyframes spin`）；
  - `running` 状态点：温和呼吸脉冲（`@keyframes pulse`）。
- **零布局抖动（Zero CLS）硬规则**：
  - 禁止在横向工具栏中按条件动态插入/移除新表单控件（彻底根治 API Keys 选日期跳行）；
  - 禁止在列表最底部隐蔽追加编辑/调试大面板（必须使用 Modal 或右侧 Drawer）；
  - 打开 Modal/Drawer 时锁定 `body` 滚动并补偿滚动条宽度，避免页面左右晃动；
  - 表格与卡片首次加载使用 `Skeleton` 骨架屏或轻量加载行，**严禁首帧先闪现“暂无数据”或“数据库不可用”红灯**。

### 2.2 键盘、防呆与状态机规范

1. **弹层键盘与焦点规则**：
   - 所有 Modal / Drawer / ConfirmDialog 支持 `Esc` 关闭（高危执行中禁用关闭）、自动聚焦首输入或关闭按钮、Focus Trap（Tab 不穿透至背后页面）、关闭后焦点回到触发按钮；
   - 表单弹窗支持 `Enter` 提交，多行 JSON/调试弹窗支持 `⌘/Ctrl + Enter` 执行；
   - **一次性密码弹窗禁止点击遮罩误关**。
2. **统一反馈分层**：
   - **瞬态结果（成功/轻错）** → 右上角 `Toast`（Sonner 或轻量自建，单次只展示最新相关状态，避免多条 `role="status"` 冲突，成功自动 3s 消失，错误 5s 或手动关闭）；
   - **表单字段校验错误** → 就近展示在对应字段下方（中文），重新编辑即清除；
   - **页面级加载失败** → 内容区展示带「重试」按钮的错误状态卡；
   - **后端英文错误中文映射**：在 `src/lib/api.ts` 集中建立常见后端英文报错到中文提示的映射表（如 `Invalid username or password`、`Username already exists`、`Role cannot be deleted while assigned`、`Preview is stale`、`Cannot create a key for a disabled user`、`Current password is incorrect` 等），兜底保留原文。
3. **竞态、防连点与脏状态保护**：
   - 所有依赖 `id` / `offset` 切换拉取数据的 `useEffect`（服务工具、角色授权、他人 Keys、审计分页、概览统计）必须接入 `AbortController` 或请求递增版本号守卫；
   - 所有异步写按钮必须绑定独立 `busy` 态并 `disabled` + loading 图标，严禁共享同一个 `busy` 造成无关按钮错位变态；
   - 角色授权修改未保存、REST 导入有编辑草稿时，切换目标/离开前弹确认拦截。
4. **基础工程修复**：
   - **路由**：接入 URL 路由（推荐先评估 History API + 生产 SPA fallback，或轻量 Hash 路由），切页自动 `window.scrollTo(0, 0)` 并更新 `document.title`；
   - **401 拦截与登出清理**：`api()` 遇到 401 自动回调重置登录态；登出和改密必须一次性清空 `user / view / keyOwner / reveal / error`，杜绝旧凭证弹窗残留与切普通用户白屏；
   - **剪贴板降级**：封装 `src/lib/clipboard.ts`，优先 `navigator.clipboard.writeText`，非 HTTPS 内网环境自动降级 `textarea + execCommand("copy")`，始终 `try/catch` 并配合 Toast 反馈；
   - **JSON 校验工具**：封装 `src/lib/json.ts`，解析失败返回中文错误并指明所属模块/字段（杜绝裸抛英文 `SyntaxError`）。

---

## 三、核心组件基座清单（`apps/web/src/components/ui/`）

建议优先引入 **Tailwind CSS v4（`@tailwindcss/vite`）+ 精选 Radix UI Primitives（`@radix-ui/react-dialog`、`@radix-ui/react-select`、`@radix-ui/react-popover`、`@radix-ui/react-switch`、`@radix-ui/react-dropdown-menu`、`@radix-ui/react-tooltip`）+ `sonner`**（如要求零新依赖，则用 React Portal 自建同等无障碍组件）：

| 组件 | 核心职责 | 替代的旧问题实现 |
| --- | --- | --- |
| `Button` / `IconButton` | 统一 `sm(30)/md(36)/lg(40)` 高度、`primary/secondary/ghost/danger` 变体、内置 `loading` 态 | 6 套不齐按钮高度、无防连点 |
| `Input` / `Textarea` / `PasswordInput` / `SearchInput` | 统一 `36px` 高度、焦点环、禁用态、密码显隐切换、搜索一键清空 | 强耦合容器类、缺禁用态与显隐 |
| `Select` / `SegmentedControl` | Portal 弹出防裁切、统一定高 `36px`、键盘上下选择 | 漂移参差的原生 `<select>` |
| `Switch` | 清晰启停开关 | 悬空错位的裸 checkbox |
| `Modal` | 居中弹窗（固定头/滚动体/固定底）、`Esc`、Focus Trap、滚锁 | 仅特化 `SecretDialog` |
| `Drawer` | 右侧滑出抽屉（支持 `640px / 760px` 宽档、吸顶头、独立滚动） | 左窄右空 Split + 整页替换 |
| `ConfirmDialog` | 统一危险/警告二次确认（高亮实体 + 副作用列表 + `busy` 态） | `window.confirm` 与零确认 |
| `SecretDialog` | 扩展 `kind: "password" \| "api-key"`：一次性密码标红警示不可复查、禁点遮罩关闭 | 对哈希密码谎称可再次复制 |
| `Badge` / `Tag` / `EmptyState` / `Skeleton` | 胶囊状态微标、角色标签、带图标与 CTA 的空态、骨架屏 | 2px 方块、闪现“暂无数据” |
| `CopyButton` / `Toaster` | 带 HTTP 降级的复制按钮 + 全局 Toast 队列 | HTTP 报错崩溃、写操作静默 |

---

## 四、逐页详细整改规格与必过红线

### 4.1 MCP 服务与工具目录（`ServicesPage` + `ServiceEditor` + `ToolPanel`）

- **已定位 P0/P1 缺陷**：
  - `.service-split` 左窄右空且默认未选中空态（`ServicesPage.tsx:26,150,299`）；编辑/新建整页替换丢上下文（L140-149）；快切服务无竞态取消且 `loadTools` 依赖整对象重复请求（L49-102）；编辑中点「登记服务」因缺 `key` 残留旧配置误新建（L133,140-148、`ServiceEditor.tsx:12-21`）。
  - `.tool-card-head` 左侧缺 `flex: 1; min-width: 0`、右侧 `.button-row` 缺 `flex-shrink: 0` 且 `flex-wrap: wrap`，长描述必将按钮挤错位（`ToolPanel.tsx:99-149`、`console.css:235-254`）；描述无截断。
  - 试调用与 REST 编辑硬挂列表最底端看不见、两状态不互斥且共用 `busy`/`error`（`ToolPanel.tsx:13-18,161-224`）；漏判后端 `result.isError: true`（`execution.ts:16-34`）。
  - 后端已返回 `description / transport / headers / serverInfo` 全丢弃；0 变更仍弹 Sync Preview、Modified 裸堆两块无标签 JSON 夹杂 `serviceId`、409 过期无一键重检；`ServiceEditor` 中 `const [timeout, setTimeout]` 遮蔽全局 `setTimeout`、`step="0.001"` 清空跳 `0`、Headers 只能裸写 JSON。
- **目标排版与交互**：
  1. **主列表 — 响应式多列卡片网格**：`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;`。顶部工具栏：`SearchInput`（搜名/命名空间/URL/描述）+ 协议 `SegmentedControl`（全部 / MCP / REST）+ 状态 `Select` + 刷新 + `+ 登记服务`。
     - 单卡 4 层有序排版：① 头部：服务名（单行省略）+ `MCP/REST` 徽标 + 启用 `Switch` / 状态灯；② 技术行：`namespace`（mono）· 传输（`HTTP/SSE`）+ URL 单行省略；③ 说明行：`description` 2 行截断等高对齐；④ 底栏：工具数（如后端补 `toolCount` 则显示）+ 连接状态胶囊 + 「查看工具」与 `···` 菜单（编辑、测试连接、同步工具、删除）。
  2. **登记 / 编辑服务 — 居中 Modal（640px，绑定 `key={initial?.id ?? "new"}`）**：
     - 纵向分区：基本信息（名、命名空间 + 实时前缀预览 `{ns}__<tool>`、2 行说明）→ 接入配置（类型切换、MCP 传输、按类型动态 placeholder 的 URL、整数秒超时 + 快捷预设 `15/30/60/120s`，重命名变量为 `timeoutInput`）→ 固定请求头（**默认 Key-Value 行编辑器 + 密文眼睛切换 + 常用鉴权模板 + JSON 切换 Tab**）→ 底栏左放「保存后启用」Switch、右放「取消 / 保存服务」。
     - 改命名空间命中工具重命名时，弹窗内切换为警示确认视图（改名列表限高 `220px` 滚动；同时提示连接参数变更将重置现有连接）。
  3. **服务详情与工具目录 — 右侧大抽屉（740px 宽，点击卡片滑出）**：
     - 吸顶头：服务名 + 启停 Switch + 连接状态 + 关闭按钮；元信息条（类型、命名空间、传输、超时、已配请求头数、可复制 URL、服务说明）；高频动作条（`同步工具` / `定义 REST 工具`、`测试连接`、`编辑`、`··· → 删除`）。测试连接成功弹 Toast 展示 `serverInfo`。
     - **工具目录主体**：标题 `工具目录 (N)` + 工具搜索框；单条工具卡片头部严格采用 **左 `flex: 1; min-width: 0` + 右 `.tool-actions { flex-shrink: 0; flex-wrap: nowrap; gap: 6px }`**，长描述默认 2 行截断并支持「展开」，**保证按钮在任意宽度和描述长度下绝对水平不折行错位**；REST 工具前置彩色 Method 徽章 + mono `path`；参数区默认折叠显示 `N 个参数 · M 个必填`，展开支持「结构化参数表 | 原始 JSON Schema」切换；删除走 `ConfirmDialog`。
  4. **重型交互升级为独立二级 Modal**：
     - **试调用 Modal（860px 左右分栏）**：左栏支持「表单填参（按 Schema 生成）| JSON 参数（校验/格式化/填示例）」；右栏明确区分成功绿标与 `result.isError: true` 红标、实测耗时（ms）、一键复制与「友好预览（解包 MCP text 并格式化）| 原始 JSON（保留 `data-testid="tool-result"`）」。
     - **REST 工具编辑 Modal（680px）**：提供「可视化表单 | JSON 定义」双向切换。
     - **同步差异 Modal（760px）**：`added + modified + deleted === 0` 时不弹窗直接 Toast“已是最新”；有变更按 `+新增 / ~更新 / -删除` 分类，删除前置红警（告知清理授权），更新剥离 `serviceId` 噪音并左右对照，捕获 `409` 提供一键「重新检测差异」。

### 4.2 用户管理（`UsersPage`）

- **已定位 P0/P1 缺陷**：常驻顶部 `.inline-create` + 原生 `<fieldset>`（`UsersPage.tsx:103-132`）；表格内 `<details>` 角色编辑器被 `.table-frame/.table-wrap` 硬裁切、保存不关闭、收起留脏态（L162,231-267）；停用（同步永久吊销全部有效 Key）与重置密码零确认无防重（L56-77）；无自定义角色形成死胡同；缺搜索筛选与 `createdAt` 展示；缺首屏 loading 闪现空表。
- **目标排版与交互**：
  - 彻底移除顶部内联创建表单；页头右置刷新 + `+ 新建用户` 主按钮；无自定义角色时顶部展示轻引导条 + `前往角色与授权 →`。
  - 工具栏：`SearchInput`（账号）+ 状态 `SegmentedControl`（全部 / 启用 / 停用）+ 角色 `Select` + 人数统计。
  - 表格列：`账号`（加粗 + 管理员/当前登录徽标）| `角色`（Tag/Pill 列表）| `状态`（语义胶囊）| `创建时间`（`createdAt` 等宽）| `操作`（`调整角色`、`Keys`、`重置密码`、`停用/启用`）。
  - **新建用户 Modal**：账号输入 + 可搜索多选角色列表（强制 ≥1 角色）→ 提交成功后无缝切至 `SecretDialog(kind="password")` 展示一次性初始密码。
  - **调整角色 Modal**（彻底取代被裁切的 `<details>`）：清晰勾选并校验 ≥1 角色，保存成功自动关闭并弹 Toast。
  - **高危确认**：停用弹 `ConfirmDialog(danger)` 明确列出「① 立即踢出全部会话；② 永久吊销名下全部有效 API Keys 且重新启用无法恢复」；重置密码弹 `ConfirmDialog(warning)` 后展示一次性新密码。

### 4.3 角色与授权（`RolesPage`）

- **已定位 P0/P1 缺陷**：顶部孤立 520px 创建框（`RolesPage.tsx:123-132`）；忽略 `parentId` 导致所有服务全堆顶、所有工具全堆底（L178-236、`resources/routes.ts:32-37`）；快切角色无竞态守卫且 `.catch(() => setGrants([]))` 报错静默清空权限（L42-50）；切角色静默丢未保存修改；删除角色零确认；平级复选框误导“勾服务=全选工具”；`.role-layout(overflow:hidden)` 阻断 sticky 保存栏；保存成功零提示。
- **目标排版与交互**：
  - 移除顶部孤立创建框，页头右侧提供 `+ 新建角色` 按钮（弹窗创建并自动选中）。
  - 双栏布局（左 `240px` 角色列表 + 右 `1fr` 授权面板，**严禁在容器上设 `overflow: hidden`**）：
    - 左侧：角色搜索 + 角色列表（显示角色名与已授工具数摘要）。
    - 右侧吸顶头：当前角色名 + 授权统计 + 工具搜索框 + `仅看已授权` 开关 + `全部展开/折叠` + `删除角色`（弹 `ConfirmDialog(danger)`）。
    - **按服务分组的树形折叠卡片**（结合 `parentId` 与 `/api/admin/services`）：卡片头显示服务名、`MCP/REST` 徽标、启停态、已授比例 `X / Y`、快捷 `全选工具 / 清空`；明确区分工具调用权与目录可见（当勾选 ≥1 工具时显示只读 `目录自动可见`，0 工具时以次级开关说明 `仅开放空目录（不含工具调用）`）；展开体缩进展示工具行。`Skills` 拆为「受限技能」与「公开技能（默认折叠只读说明）」。
    - **脏态吸底保存栏**：存在未保存改动时底部浮现 `有 N 项未保存更改 · 撤销 / 保存授权`；切角色/刷新前脏态确认；加载加 `AbortController` 且失败展示重试卡**绝不清零 `grants`**；保存成功弹 Toast。

### 4.4 API Keys（`KeysPage`）

- **已定位 P0/P1 缺陷**：顶部把创建表单伪装成筛选栏，34px 按钮 + 36px 输入 + 原生 `<select>` 高度错落，选自定义日期动态插 `datetime-local` 导致剧烈重排换行漂移（`KeysPage.tsx:106-141`）；缺状态筛选与搜索；吊销零确认；代管他人 Keys 无返回用户页与面包屑、`ownerName` 初始闪烁、停用用户仍放开创建撞 409；点复制图标却强弹 3 步弹窗且失效 Key 仍可复制；丢弃 `createdAt / revokedAt`。
- **目标排版与交互**：
  - **代管上下文条**（仅管理员看他人 Keys 时）：页头提供 `← 返回用户列表` 与 `切换回我的 Keys`，面包屑显示 `用户 / <username> / API Keys`；目标用户已停用时禁用 `+ 创建 Key` 并显眼提示原因；修复 `ownerName` 初始闪烁。
  - **创建与筛选彻底解耦**：
    - 页头右侧 `+ 创建 Key` → 居中纵向 Modal（名称 + 有效期预设胶囊 `30 天 / 90 天 / 1 年 / 永久 / 自定义日期`，选自定义在纵向流展开带 `min` 未来校验的日期选择器，零横向漂移；创建后弹 `SecretDialog(kind="api-key")`）；
    - 表格上方独立 `36px` 严齐筛选工具栏：`SearchInput`（名称）+ 状态 `SegmentedControl`（`全部 / 有效 / 已过期 / 已吊销` 含计数）。
  - 表格列：`名称` | `凭证`（首尾脱敏 `ach_xxxx…xxxx` + 有效 Key 一键直复按钮 + 「查看明文」图标）| `创建时间` | `有效期`（≤7 天加 `badge-warn` 临期提醒）| `状态`（已吊销附吊销时间提示）| `操作`（有效 Key 红色 `吊销` → `ConfirmDialog(danger)`）。

### 4.5 登录页、概览页、REST 导入与调用审计（全站一致性整改）

1. **登录页（`LoginPage.tsx`）**：
   - 修复 `editorial.css:28-32` `.login-brand span` 误覆盖 `.brand-icon` 颜色与 6px 左偏 Bug；右侧标题改 `<h2>` 保证全页单一 `<h1>`；移动端 `<= 960px` 用 `order: -1` 将登录表单置顶；补 `autoFocus`、密码显隐、提交前 `trim()`、中文错误条、移除静态假绿点。
2. **概览页（`OverviewPage.tsx` & `UsageCard.tsx`）**：
   - **必修 3 个 Bug**：① `activeKeyCount` 同步排除已过期 Key（L46）；② 健康状态区分 `loading / ok / error` 三态（修复 API 故障显“检查中”、DB 首帧闪红“不可用”，L88-104）；③ 刷新按钮加 `disabled` + 旋转 + `AbortController`。
   - **架构升级**：将低频「修改密码」移出首屏底部，收进顶栏账号菜单弹窗（补确认新密码、显隐、loading、成功后带提示跳转登录并重置 `view`）；MCP 接入区提供可切换客户端（Claude / Cursor / Codex / 通用 HTTP）的一键复制 JSON 配置片段；管理员补充平台级汇总卡与快捷入口。
3. **REST 导入页（`ImportPage.tsx`）**：
   - 拆分为 `ImportSourceForm` + `ImportTargetGroupCard` 控制单文件行数；
   - 错误/成功反馈置顶并精准定位具体报错的服务组与操作行；
   - **解绑 `<details open={operation.checked}>`**（L381），默认折叠操作行，点击「编辑定义」在右侧抽屉或按需展开编辑；增加操作汇总条与「全选可转换 / 仅选新增与修改 / 清空」及搜索；
   - 切换「保存方式」或来源前增加脏态确认（或按 `operationId` 保留已编辑草稿）；差异标签分色（新增绿 / 修改橙 / 保持灰）；预览与确认拆分独立 `busy`；文件上传改拖拽 Dropzone 并修复切 mode 状态残留；按 OpenAPI / cURL 动态切提示语；底部增吸底确认条，成功后提供「前往角色与授权」直达按钮。
4. **调用审计页（`AuditPage.tsx`）**：
   - 修复翻页失败不回滚 `offset`（L30-39）、无 `AbortController`、刷新按钮无反馈等 Bug；翻页后自动回顶；
   - 表格列宽合理分配：时间列 `white-space: nowrap`（hover 展示含毫秒完整时间），`toolName`（最长 128 字符）与客户端列截断 + tooltip + 一键复制；`running` 加脉冲动效、`unknown`/`—` 补说明 tooltip；
   - 顶部增加筛选工具栏（如后端配合则支持服务端筛选 + `total/hasMore` 根治末页 100 条空页问题；纯前端阶段先提供当前页即时过滤与安全翻页）。

---

## 五、给后续执行 Agent 的工程交付约束与验收清单

### 5.1 仓库规则与文件规模控制（严守 `AGENTS.md`）

- 从 `origin/main` 切需求分支（如 `dev_web_ui_polish_<yyMMdd>`），按小功能 TDD 节奏提交，提交格式 `type(scope): desc`，整体完成后**等待用户确认再合入 `main`**，未经要求不推送远端。
- **单文件物理行数 ≤ 500 行**（绝不无故超过 700 行）：
  - 拆分当前超标风险文件：`base.css`（487 行）、`ImportPage.tsx`（430 行）、`ServicesPage.tsx`（306 行）、`ToolPanel.tsx`（227 行）。
  - 推荐目录规划：
    - `apps/web/src/lib/`：`api.ts`（含 401 回调与中文错误映射）、`json.ts`、`clipboard.ts`
    - `apps/web/src/hooks/`：`useAbortableRequest.ts`、`useToast.ts`、`useConfirm.ts`
    - `apps/web/src/components/ui/`：基础原语组件（`Button`、`Input`、`Select`、`Switch`、`Modal`、`Drawer`、`ConfirmDialog`、`Badge`、`EmptyState`、`Skeleton`、`CopyButton`、`Toaster`）
    - `apps/web/src/components/layout/`：`AppShell.tsx`、`PageHeader.tsx`、`FilterToolbar.tsx`
    - `apps/web/src/components/domain/`：`SecretDialog.tsx`、`ServiceCard.tsx`、`ServiceDrawer.tsx`、`ServiceEditorModal.tsx`、`SyncPreviewModal.tsx`、`ToolPanel.tsx`、`ToolTestModal.tsx`、`RestToolModal.tsx`、`UsageCard.tsx`、`PasswordModal.tsx`、`ImportSourceForm.tsx`、`ImportTargetGroupCard.tsx`

### 5.2 前后端边界约定

- **纯前端即可完成（零后端改动）**：全部视觉体系、卡片网格/弹窗/抽屉、工具错位修复与调试弹窗、用户/角色/Keys 交互重构、按 `parentId` 组装角色授权树、所有竞态/防呆/逻辑 Bug 修复。
- **可选轻量后端增强（建议同步确认，共 < 60 行增量，零破坏性）**：
  1. `GET /api/admin/services` 补充 `toolCount: number` 与 `lastError?: string`；
  2. `GET /api/admin/roles` 补充 `userCount: number` 与 `grantCount: number`；
  3. `GET /api/admin/audit` 补充 `status / q / limit` 筛选参数与 `total / hasMore`（可选在 `audit` 表补 `durationMs / errorMessage`）。

### 5.3 建议分阶段实施顺序

1. **Phase 1 — 底座与壳层**：引入/搭建 Design Tokens + `components/ui/` 基座 + URL 路由 + `AppShell`（Sticky Topbar、真实健康点、账号改密弹窗、Toast/ConfirmDialog、401 拦截、HTTP 复制降级）。
2. **Phase 2 — MCP 服务与工具**：卡片网格 + `ServiceEditorModal` + `ServiceDrawer` + 修复工具挤压错位 + `ToolTestModal` / `RestToolModal` / `SyncPreviewModal` + 竞态修复。
3. **Phase 3 — 访问控制三页**：`UsersPage`（Modal 建用户与调角色 + 停用/重置二次确认）→ `RolesPage`（树形服务分组 + 脏态保护 + 吸底保存）→ `KeysPage`（Modal 创建 + 预设有效期 + 36px 筛选栏 + 吊销确认 + 代管上下文）。
4. **Phase 4 — 其余四页补齐**：`LoginPage` → `OverviewPage`（修 3 个 Bug + 客户端接入代码）→ `ImportPage`（拆分组件 + 顶栏反馈 + 解绑 `<details open>`）→ `AuditPage`（安全翻页 + 列宽截断 + 筛选）。
5. **Phase 5 — E2E 同步与全分辨率验收**：同步更新 4 个 Playwright 测试并截图复验。

### 5.4 Playwright E2E 同步要点与最终验收清单

- **同步修改关注点**：
  - 4 个测试共 14 处 `getByRole("button", { name: "MCP 服务" | ... })`——若导航改为 `<a href>` 须同步改为 `link`（含 `usage-console.spec.ts:43` 反向断言防假通过）；
  - 表单必填 `*` 必须加 `aria-hidden="true"` 保持 `getByLabel("...", { exact: true })` 不失效；
  - `usage-console.spec.ts:14-34`（行内直填角色/用户/Keys）需同步改为先点新建按钮再操作弹窗；
  - `import-console.spec.ts:21-24` 与 `import-inputs-console.spec.ts:17,24,29-34` 需同步适应新展开/编辑交互、单条 `role="status"`（防 Toast 队列 strict mode 冲突）及请求头编辑方式；
  - 保留 `data-testid="tool-result"`、`usage-total`、`usage-successful`、`usage-failed` 与关键 `aria-label`。
- **最终验收命令与视觉检查点**：
  - `pnpm --filter @ach/web typecheck`、`pnpm --filter @ach/web build`、`pnpm test`、`pnpm test:e2e` 全部通过；
  - 浏览器实测 **1920px（宽屏无死白墙）、1280px（常规桌面）、900px（平板无 236px 挤压）、390px（移动端抽屉导航）** 四个视口；
  - 逐项核验：长描述 MCP 工具按钮绝不错位、试调用清晰区分 `isError`、一次性密码弹窗明确警示不可复查、用户表格末尾行调整角色无裁切、高危操作均有二次确认、API Keys 切换自定义日期零跳动漂移、F5 刷新保留当前页面。
