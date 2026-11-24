import { useId, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";
import { Button, Field, Input, Select, Textarea, cn } from "../ui";

export type ImportInputMode = "text" | "file" | "url";

export interface ImportSourceFormProps {
  kind: "openapi" | "curl";
  mode: ImportInputMode;
  text: string;
  url: string;
  baseUrl: string;
  file: { name: string; content: string } | null;
  busyPreview: boolean;
  onModeChange: (mode: ImportInputMode) => void;
  onTextChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onFileChange: (file: { name: string; content: string } | null) => void;
  onFileError: (message: string) => void;
  onPreview: () => void;
}

/** Step-1 import source input card supporting OpenAPI text/dropzone/URL and cURL text. */
export function ImportSourceForm({
  kind,
  mode,
  text,
  url,
  baseUrl,
  file,
  busyPreview,
  onModeChange,
  onTextChange,
  onUrlChange,
  onBaseUrlChange,
  onFileChange,
  onFileError,
  onPreview,
}: ImportSourceFormProps) {
  const [dragging, setDragging] = useState(false);
  const modeId = useId();
  const textId = useId();
  const urlId = useId();
  const fileId = useId();
  const baseUrlId = useId();

  const readSelectedFile = (selected: File | undefined) => {
    if (!selected) return;
    void selected
      .text()
      .then((content) => onFileChange({ name: selected.name, content }))
      .catch((reason) => onFileError(reason instanceof Error ? reason.message : "无法读取文件内容"));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    readSelectedFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white p-5 flex flex-col gap-4 shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#111827]">导入来源</h3>
          <p className="text-[12px] text-[#4B5563] mt-0.5">
            {kind === "openapi"
              ? "支持 OpenAPI 3.0.x / 3.1.x（JSON 或 YAML），不支持 Swagger 2.0；不同 server URL 自动分组。"
              : "仅解析单条 cURL 请求结构，不执行 shell 命令、不读取本机文件或环境变量。"}
          </p>
        </div>

        {kind === "openapi" && (
          <div className="flex items-center gap-2">
            <label htmlFor={modeId} className="text-[12px] font-medium text-[#4B5563] whitespace-nowrap">
              输入方式
            </label>
            <Select
              id={modeId}
              value={mode}
              onValueChange={(next) => onModeChange(next as ImportInputMode)}
              options={[
                { value: "text", label: "粘贴 JSON / YAML" },
                { value: "file", label: "上传文件" },
                { value: "url", label: "文档 URL" },
              ]}
            />
          </div>
        )}
      </div>

      {mode === "text" && (
        <Field label="导入原文" htmlFor={textId}>
          <Textarea
            id={textId}
            mono
            className="min-h-[180px]"
            value={text}
            placeholder={
              kind === "openapi"
                ? '粘贴 OpenAPI JSON 或 YAML 文档，例如 {"openapi":"3.1.0",...}'
                : "粘贴单条 curl 命令，例如 curl 'https://api.example/v1/items?limit=10' -H 'Authorization: Bearer ...'"
            }
            onChange={(event) => onTextChange(event.target.value)}
            spellCheck={false}
          />
        </Field>
      )}

      {mode === "url" && (
        <Field label="文档 URL" htmlFor={urlId}>
          <Input
            id={urlId}
            mono
            type="url"
            value={url}
            placeholder="https://api.example/openapi.yaml"
            onChange={(event) => onUrlChange(event.target.value)}
          />
        </Field>
      )}

      {mode === "file" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={fileId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-[var(--radius-md)] border border-dashed cursor-pointer transition-colors",
              dragging
                ? "border-[#2563EB] bg-[#EFF6FF]"
                : "border-[#CBD2DF] bg-[#F5F6F8] hover:border-[#9CA3AF]",
            )}
          >
            <FileUp size={20} strokeWidth={1.75} className="text-[#4B5563]" />
            <span className="text-[13px] font-medium text-[#111827]">
              OpenAPI 文件（点击选择或拖拽到此处）
            </span>
            <span className="text-[12px] text-[#5B6270]">支持 .json、.yaml、.yml 格式</span>
            {file && (
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-white border border-[#E2E5EC] font-mono text-[12px] text-[#111827]">
                {file.name}
              </span>
            )}
          </label>
          <input
            id={fileId}
            type="file"
            accept=".json,.yaml,.yml"
            className="sr-only"
            onChange={(event) => readSelectedFile(event.target.files?.[0])}
          />
        </div>
      )}

      {kind === "openapi" && mode !== "url" && (
        <Field label="相对 server 的基址（可选）" htmlFor={baseUrlId}>
          <Input
            id={baseUrlId}
            mono
            type="url"
            value={baseUrl}
            placeholder="https://api.example/openapi.yaml"
            onChange={(event) => onBaseUrlChange(event.target.value)}
          />
        </Field>
      )}

      <div className="flex items-center justify-end">
        <Button variant="primary" loading={busyPreview} onClick={onPreview}>
          {busyPreview ? "解析中…" : "解析预览"}
        </Button>
      </div>
    </div>
  );
}
