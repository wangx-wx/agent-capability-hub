export interface ImportOperation {
  id: string;
  label: string;
  supported: boolean;
  reasons: string[];
  definition: Record<string, unknown>;
}
export interface ImportGroup {
  id: string;
  url: string;
  name: string;
  namespace: string;
  headers: Record<string, string>;
  operations: ImportOperation[];
}
export interface ImportPreview {
  id: string;
  kind: "curl" | "openapi";
  groups: ImportGroup[];
}
