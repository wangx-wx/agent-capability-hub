export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `请求失败 (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function errorMessage(reason: unknown) { return reason instanceof Error ? reason.message : "请求失败"; }
