export interface ImportOperation {
  id: string;
  label: string;
  supported: boolean;
  reasons: string[];
  definition: Record<string, unknown>;
  change?: "added" | "modified" | "unchanged";
  existingToolId?: string;
}
export interface ImportGroup {
  id: string;
  url: string;
  name: string;
  namespace: string;
  headers: Record<string, string>;
  operations: ImportOperation[];
  serviceId?: string;
  revision?: string;
}
export interface ImportPreview {
  id: string;
  kind: "curl" | "openapi";
  groups: ImportGroup[];
}
