export class ApiError extends Error {
  readonly status: number;
  readonly rawMessage: string;

  constructor(status: number, rawMessage: string, translatedMessage: string) {
    super(translatedMessage);
    this.name = "ApiError";
    this.status = status;
    this.rawMessage = rawMessage;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registers a callback invoked on HTTP 401 responses outside login/session-probe endpoints. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

const EXACT_ERROR_MAP: Record<string, string> = {
  "Authentication required": "登录状态已失效，请重新登录",
  "Administrator access required": "需要管理员权限才能执行此操作",
  "Invalid username or password": "账号或密码错误",
  "Current and new passwords are required": "请输入当前密码与新密码",
  "Current password is incorrect": "当前密码不正确",
  "Username and at least one role are required": "请填写账号并至少分配一个角色",
  "Username already exists": "账号已存在",
  "User not found": "未找到对应用户",
  "An active status is required": "请提供有效的启用状态",
  "At least one role is required": "请至少选择一个角色",
  "One or more roles are invalid": "所选角色无效或已被删除",
  "Role name is required": "请输入角色名称",
  "Role name already exists": "角色名称已存在",
  "Role not found": "未找到对应角色",
  "Role cannot be deleted while assigned": "该角色仍分配给用户，请先移除关联后再删除",
  "Resource ids are required": "请提供资源授权列表",
  "One or more resources are invalid": "部分授权资源无效或已被删除",
  "Name and expiry choice are required": "请填写名称并明确选择有效期",
  "Expiry must be in the future": "到期时间必须晚于当前时间",
  "Expiry must be a future date or null for permanent": "有效期必须为未来时间或永久有效",
  "Cannot create a key for a disabled user": "不能为已停用用户创建 API Key",
  "API Key not found": "未找到对应的 API Key",
  "Service not found": "未找到对应服务",
  "Service name is required": "请填写服务名称",
  "Invalid service namespace": "命名空间仅支持字母、数字、下划线、点或连字符（1–64 字符）",
  "Unsupported service kind": "不支持的服务接入方式",
  "Expected an HTTP(S) URL without embedded credentials": "服务地址需为 HTTP/HTTPS URL，且不能包含嵌入式账号密码",
  "Headers must contain string values": "请求头的值必须全部为字符串",
  "Unsupported MCP transport": "不支持的 MCP 传输方式",
  "Timeout must be positive": "调用超时时间必须为大于 0 的数字",
  "Namespace already exists": "命名空间已被占用，请更换后重试",
  "Public tool name or namespace already exists": "公开工具名称或命名空间已存在",
  "A renamed tool exceeds 128 characters": "改名后的公开工具名称超过 128 个字符限制",
  "Public tool name exceeds 128 characters": "公开工具名称超过 128 个字符限制",
  "Tool not found": "未找到对应工具",
  "Tool name already exists": "该服务下已存在同名工具",
  "HTTP method/path operation already exists": "当前服务下已存在相同 HTTP 方法与路径的操作",
  "Duplicate selected tool names": "所选操作中存在重复的工具名称",
  "Duplicate HTTP method/path operations": "所选操作中存在重复的 HTTP 方法与路径",
  "Arguments must be an object": "试调用参数必须为 JSON 对象",
  "Select at least one operation": "请至少选择一个可转换操作",
  "Select supported operations from the preview": "请从当前预览中选择支持的操作",
  "Target service was deleted; preview again": "目标服务已被删除，请重新解析预览",
  "Target service changed; preview again": "目标服务配置已变更，请重新解析预览",
  "Choose the existing target during preview before confirming": "目标服务选择已变更，请先重新解析预览",
  "A newer import preview has replaced this request": "已有更新的导入预览请求覆盖本次解析",
  "Request exceeds the configured byte limit": "请求体超过系统配置的字节上限",
  "Normalized import exceeds the configured byte budget": "解析后的导入规模超过系统预算上限",
  "Invalid request body": "请求参数格式不正确",
  "Request could not be completed": "请求处理失败，请稍后重试",
  "Invalid audit status": "无效的审计状态筛选条件",
};

const PATTERN_ERROR_MAP: Array<[RegExp, string]> = [
  [/^Preview is stale/i, "预览已过期，请重新检测差异或重新解析后再确认"],
  [/^Service or latest preview changed during discovery/i, "发现过程中服务或最新预览已变更，请重新同步"],
  [/^Service kind cannot be changed/i, "服务接入方式登记后不可修改；如需更换请接入新服务"],
  [/^Existing REST service must match the target URL/i, "所选既有 REST 服务的目标地址与当前导入分组不一致，请先编辑服务配置"],
  [/^Only OpenAPI 3\.0\.x and 3\.1\.x are supported/i, "仅支持 OpenAPI 3.0.x 与 3.1.x，暂不支持 Swagger 2.0"],
  [/^OpenAPI JSON\/YAML cannot be parsed/i, "OpenAPI 文档无法解析，请检查 JSON 或 YAML 语法"],
];

/** Translates known backend English errors into concise Chinese while preserving unknown messages. */
export function translateApiError(raw: string): string {
  const trimmed = raw.trim();
  if (EXACT_ERROR_MAP[trimmed]) return EXACT_ERROR_MAP[trimmed];
  for (const [pattern, label] of PATTERN_ERROR_MAP) {
    if (pattern.test(trimmed)) return label;
  }
  return raw;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (
    response.status === 401 &&
    !path.startsWith("/api/auth/login") &&
    !path.startsWith("/api/auth/me")
  ) {
    unauthorizedHandler?.();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    const raw = body.error ?? `请求失败 (${response.status})`;
    throw new ApiError(response.status, raw, translateApiError(raw));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function isAbortError(reason: unknown): boolean {
  return (
    (reason instanceof DOMException && reason.name === "AbortError") ||
    (reason instanceof Error && reason.name === "AbortError")
  );
}

export function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "请求失败";
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDateTimeWithMs(iso: string): string {
  const date = new Date(iso);
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${formatDateTime(iso)}.${ms}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
