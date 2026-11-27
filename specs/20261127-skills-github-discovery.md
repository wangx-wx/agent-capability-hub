# Skills 广场 GitHub 来源解析规格

## 状态

方案规格，记录 Skills 广场如何从 GitHub 地址发现 Skills。尚未实现。本文的 CLI 行为基线为 npm `skills@1.9.0`，对应源码标签 `vercel-labs/skills@v1.9.0`。

本文细化并取代 [产品方向稿](agent-capability-platform/spec.md) 中“Skills 安装器解析能力尚未调研”的未决条款；不改变广场不托管 Skill 文件、由用户本地 CLI 安装的产品边界。

## 目标

用户提供 GitHub 仓库地址后，广场展示该来源中标准 Skills CLI 可发现的 Skills，并为选择的 Skill 生成标准安装命令。

广场自身只需取得发现列表和展示所需元数据，不需要下载仓库或 Skill 的完整内容。

## 硬性约束

- 解析流程不得执行 `git clone`、checkout 或其他仓库检出操作。
- 不下载 zip/tar 等仓库归档，不获取 Skill 目录中的脚本、参考资料或其他资源文件。
- 只读取 GitHub API 返回的提交/目录树，以及发现规则需要的清单文件和候选 `SKILL.md`；文件内容可通过 Contents API 或固定 commit 的 `raw.githubusercontent.com` 获取。
- 若 API 无法满足解析要求，返回可理解的错误或不完整状态；不得以 clone 作为回退。
- GitHub API 读取失败不能被解释为“仓库没有 Skills”。

## 来源范围

首期支持公开 GitHub 仓库地址，包括：

- 仓库地址：`https://github.com/{owner}/{repo}`
- 指定分支/标签下的目录地址：`https://github.com/{owner}/{repo}/tree/{ref}/{path}`
- 指向 Skill 目录的上述目录地址

HTTPS 地址必须解析为 GitHub 仓库、ref 与仓库内相对路径。拒绝非 GitHub 主机、路径穿越、文件地址和不支持的 URL 形式。短 SHA/tag/分支名由 GitHub API 解析到 commit SHA；一次解析任务中的 tree 与文件内容必须使用同一 commit，避免来源更新造成结果不一致。

私有仓库和 GitHub 登录授权不属于首期范围。首期不要求用户提供 GitHub Token。

## 发现规则

发现规则对齐 `skills@1.9.0 add` 默认模式，不启用 `--full-depth`：

1. 如果输入路径本身含有效 `SKILL.md`，将该目录作为一个 Skill 并结束默认发现。
2. 否则按优先级搜索仓库根目录、`skills/` 及其 curated/experimental/system 子目录，以及 CLI 支持的 Agent 项目 Skill 目录。
3. 已知 Skill 容器目录最多向下三层。较浅层发现 Skill 后不再向其子目录继续发现，以匹配 CLI 的路径遮蔽规则。
4. 读取根目录 `skills.sh.json` 的 `paths`，将合法的仓库内相对目录作为额外 Skill 容器，以相同深度规则搜索。
5. 读取 `.claude-plugin/marketplace.json` 与 `.claude-plugin/plugin.json` 中声明的 Skill 路径；清单声明路径按其规则解析，不套用容器目录三层遍历。
6. 如果以上约定位置与清单均未发现有效 Skill，执行 CLI 默认的有限深度递归兜底；忽略 `.git`、`node_modules`、`dist`、`build`、`__pycache__`。递归兜底最大深度与 CLI 1.9.0 实现一致（从来源根目录起最多五层目录）。
7. 同名 Skill 按 CLI 首个发现结果保留；若浅层 Skill 遮蔽了更深层目录，遵循 CLI 规则。

CLI 支持的 Agent 项目目录以 `skills@1.9.0` 中的发现清单为准，不在本规格另造目录集合。更新 CLI 基线时，须同步更新该清单和本规格版本记录。

### 有效 Skill

- Skill 目录中存在大小写不敏感的 `SKILL.md`。
- frontmatter 可解析为 YAML，并包含非空字符串 `name` 与 `description`。
- `metadata.internal` 为布尔 `true`、字符串 `"true"` 或 `"1"` 时，默认从广场发现结果中排除。
- 解析和展示时对名称、描述应用与 CLI 一致的清理规则，避免终端控制字符或不安全元数据进入 UI。

### 兜底搜索

兜底是为了与 CLI 默认行为保持一致，不是全仓库无限递归。广场不提供或触发 `--full-depth` 发现，因为该 CLI 模式要求完整检出仓库，且不符合广场的无 clone 约束。

## GitHub API 读取流程

1. 将 GitHub URL 规范化为 owner、repo、ref（可选）和 subpath（可选），并通过 Repository/Ref API 固定 commit SHA。
2. 用 Git Trees API 取得该 commit 的递归树，按对象类型和路径筛出可能的 Skill 清单、插件清单、`skills.sh.json` 与 `SKILL.md`。
3. 如果递归树响应标记 `truncated`，按 tree SHA 分段读取子树，直到获得完整路径集合；不能把被截断的树当完整结果展示。
4. 仅对发现算法需要的清单及候选 `SKILL.md` 发出 Contents API 或固定 commit 的 raw 文件读取请求。
5. 按发现规则筛选并解析有效 Skill，返回 Skill 名称、描述、仓库相对目录、`SKILL.md` 路径、固定 commit SHA 和来源 URL。

读取限于上述文件。Skill 的完整目录内容仅由用户之后运行的本地 Skills CLI 获取。

## 安装命令

- 仓库来源生成 `npx skills@latest add {owner}/{repo} --skill {skill-name}`。
- 指定 ref/subpath 时保留对应来源 URL，使命令指向用户解析的来源范围；具体转义与 ref 表达按 `skills@1.9.0` 的 source parser 验证。
- 命令按用户选择的 Agent 追加 `-a {agent}`；未选择 Agent 时不猜测本机环境，由本地 CLI 决定。
- 安装过程由用户在本地执行；平台不代理、执行或模拟安装。

## 错误与状态

- URL 格式无效、仓库不存在、ref/path 不存在、GitHub API 限流/不可达、树不完整、清单或 frontmatter 无效，应区分显示来源错误、部分解析或跳过条目。
- API 限流、认证和网络错误不能静默显示为空目录。
- 单个 Skill 的 frontmatter 无效时跳过该条目并保留其他有效条目；在结果中提供可见的解析提示。
- 解析结果标明 commit SHA 与解析时间，用户可主动刷新以重新解析最新来源。

## 验收标准

1. 输入仓库 URL 后，公开仓库解析不启动 Git、clone、checkout 或归档下载进程。
2. 输入根目录或 Skill 子目录 URL 时，只发现该来源范围内 CLI 默认可发现的 Skills。
3. 标准 Skill 容器、Agent Skill 目录、`skills.sh.json` 自定义路径及 Claude 插件清单路径均能被发现。
4. 标准位置没有有效 Skill 时，有限深度兜底与 `skills@1.9.0` 默认发现结果一致；超过深度的 Skill 不出现。
5. root Skill、浅层遮蔽、同名 Skill、internal Skill、无效 YAML 和缺失必填字段的行为符合 CLI 1.9.0。
6. 目录树被 GitHub 标为 truncated 时，服务分段读取子树或明确报不完整，不返回伪完整目录。
7. 分支前进过程中，目录与 `SKILL.md` 解析始终固定在同一个 commit SHA。
8. GitHub API 失败或限流显示为解析失败/重试状态，绝不显示为“没有 Skills”。
9. 生成的命令使用标准 `skills add` 和 `--skill`，不触发平台端安装。

## 实施前待定

- GitHub API 结果缓存时长、主动刷新频率及跨用户缓存策略。
- 公共 API 未认证限流下的并发与分页/子树请求上限。
- 是否需要后续支持私有 GitHub 仓库及用户授权方式。
- CLI npm 基线升级时的兼容策略与自动化差异检查方式。

## 参考

- [`skills@1.9.0` Skill discovery 文档](https://github.com/vercel-labs/skills/blob/v1.9.0/docs/creating-skills.md#skill-discovery)
- [`skills@1.9.0` 发现器](https://github.com/vercel-labs/skills/blob/v1.9.0/src/skills.ts)
- [`skills@1.9.0` GitHub Tree 快速路径](https://github.com/vercel-labs/skills/blob/v1.9.0/src/blob.ts)
- [`skills@1.9.0` `add` 流程](https://github.com/vercel-labs/skills/blob/v1.9.0/src/add.ts)
- [GitHub Git Trees API](https://docs.github.com/en/rest/git/trees)
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
