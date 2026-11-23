# MCP 接入交付记录

依据 [接入规格](20261122-mcp-rest-integration.md)和 [TDD 边界](20261122-mcp-tdd-boundaries.md)继续在用户指定的 `dev_mcp_research_261121` 实施。前一日切片历史见 [实施记录](20261122-mcp-implementation.md)。

## 重导入

2026-11-23：重导入增加 `targetServices`（目标 URL → 既有 REST 服务 ID）预览选择，展示操作 added／modified／unchanged 与匹配的内部 ID。

确认在事务中按 HTTP 方法与路径模板匹配，已有操作更新保留 ID 和授权；未选旧操作不删除，新操作默认未授权。服务和目录快照发生变化时要求重新预览。

真实 HTTP／SDK 测试验证工具改名和 schema 修改、旧 ID／授权保留、未选操作保持与历史名称保留；新建 OpenAPI／cURL 回归与前后端类型检查通过。

## 待完成

控制台及浏览器验收、接入文档、剩余协议／schema／生命周期边界复核和整体交付验证。尚未宣称整体完成，未合入 main 或推送。
