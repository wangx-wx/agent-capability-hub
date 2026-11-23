import type { ServiceTable } from "../../database/schema.js";

export interface CallerContext {
  userId: string;
  keyId?: string;
  isAdmin: boolean;
}

// All adapters resolve credentials here; a future user source can use the caller context.
export function resolveServiceCredentials(service: ServiceTable, _caller?: CallerContext): Record<string, string> {
  return JSON.parse(service.headers);
}
