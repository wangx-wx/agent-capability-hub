import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "../lib/api";
import { parseJsonObject } from "../lib/json";
import type { Service } from "../types";
import { Button, ConfirmDialog } from "./ui";
import { ImportSourceForm, type ImportInputMode } from "./domain/ImportSourceForm";
import {
  ImportTargetGroupCard,
  type DraftGroup,
  type DraftOperation,
  type ImportOperation,
} from "./domain/ImportTargetGroupCard";

interface Group {
  id: string;
  url: string;
  name: string;
  namespace: string;
  headers: Record<string, string>;
  operations: ImportOperation[];
  serviceId?: string;
}

function draftKey(url: string, label: string): string {
  return `${url}\0${label}`;
}

function sameTarget(service: Service, url: string): boolean {
  try {
    return service.kind === "rest" && new URL(service.url).toString() === new URL(url).toString();
  } catch {
    return false;
  }
}

export function RestImportForm({
  format: kind,
  targetService,
  onSaved,
}: {
  format: "openapi" | "curl";
  targetService?: Service;
  onSaved: (services: Service[]) => void;
}) {
  const [mode, setMode] = useState<ImportInputMode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [services, setServices] = useState<Service[]>(targetService ? [targetService] : []);
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    if (!targetService) return {};
    try {
      const targetUrl = new URL(targetService.url);
      return {
        [targetService.url]: targetService.id,
        ...(targetUrl.pathname === "/" ? { [targetUrl.origin]: targetService.id } : {}),
      };
    } catch {
      return { [targetService.url]: targetService.id };
    }
  });
  const [previewId, setPreviewId] = useState("");
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [headerErrors, setHeaderErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState("");
  const [highlightedOpId, setHighlightedOpId] = useState<string | null>(null);
  const [busyPreview, setBusyPreview] = useState(false);
  const [busyConfirm, setBusyConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ label: string; run: () => void } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void api<{ services: Service[] }>("/api/admin/services", { signal: controller.signal })
      .then((result) => setServices(result.services))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const hasDirtyDrafts = groups.some((group) => group.operations.some((op) => op.dirty));

  const clearPreview = () => {
    setPreviewId("");
    setGroups([]);
    setHeaderErrors({});
    setHighlightedOpId(null);
  };

  const guardSourceChange = (label: string, run: () => void) => {
    if (previewId && hasDirtyDrafts) {
      setPendingAction({ label, run });
      return;
    }
    run();
  };

  const runPreview = async (targetServices = targets, preserveOperationDrafts = false) => {
    const previousDrafts = new Map<string, { text: string; checked: boolean; dirty?: boolean }>();
    if (preserveOperationDrafts) {
      for (const group of groups) {
        for (const op of group.operations) {
          previousDrafts.set(draftKey(group.url, op.label), {
            text: op.text,
            checked: op.checked,
            dirty: op.dirty,
          });
        }
      }
    }

    setBusyPreview(true);
    setError("");
    setHighlightedOpId(null);
    try {
      const source = mode === "file" ? { file } : mode === "url" ? { url } : { text };
      const result = await api<{ preview: { id: string; groups: Group[] } }>(
        "/api/admin/imports/preview",
        {
          method: "POST",
          body: JSON.stringify({
            kind,
            ...source,
            baseUrl: baseUrl || undefined,
            targetServices,
          }),
        },
      );
      setPreviewId(result.preview.id);
      setHeaderErrors({});
      setGroups(
        result.preview.groups.map((group) => ({
          ...group,
          headers: group.headers ?? {},
          enabled: services.find((service) => service.id === group.serviceId)?.enabled ?? false,
          operations: group.operations.map((operation) => {
            const kept = preserveOperationDrafts
              ? previousDrafts.get(draftKey(group.url, operation.label))
              : undefined;
            return {
              ...operation,
              checked: kept ? kept.checked && operation.supported : false,
              text: kept?.dirty ? kept.text : JSON.stringify(operation.definition, null, 2),
              dirty: kept?.dirty,
            };
          }),
        })),
      );
    } catch (reason) {
      clearPreview();
      setError(errorMessage(reason));
    } finally {
      setBusyPreview(false);
    }
  };

  const changeGroup = (id: string, change: Partial<DraftGroup>) => {
    setGroups((items) => items.map((group) => (group.id === id ? { ...group, ...change } : group)));
  };

  const updateOperation = (groupId: string, opId: string, patch: Partial<DraftOperation>) => {
    setGroups((items) =>
      items.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              operations: group.operations.map((op) => (op.id === opId ? { ...op, ...patch } : op)),
            },
      ),
    );
  };

  const confirm = async () => {
    setError("");
    setHighlightedOpId(null);

    const selectedGroups = groups.filter((group) => group.operations.some((op) => op.checked));
    const parsedGroups: Array<{
      groupId: string;
      serviceId?: string;
      name: string;
      namespace: string;
      headers: Record<string, string>;
      enabled: boolean;
      operations: Array<{ operationId: string; definition: Record<string, unknown> }>;
    }> = [];

    for (let i = 0; i < selectedGroups.length; i += 1) {
      const group = selectedGroups[i];
      const hdrErr = headerErrors[group.id];
      if (hdrErr) {
        setError(`目标 ${i + 1}（${group.name || group.url}）请求头格式有误：${hdrErr}`);
        return;
      }

      const parsedOps: Array<{ operationId: string; definition: Record<string, unknown> }> = [];
      for (const op of group.operations.filter((item) => item.checked)) {
        const parsed = parseJsonObject(op.text, `操作 ${op.label} 的定义`);
        if (!parsed.ok) {
          setHighlightedOpId(op.id);
          setError(`目标 ${i + 1}（${group.name || group.url}）-> ${parsed.error}`);
          return;
        }
        parsedOps.push({ operationId: op.id, definition: parsed.value });
      }

      parsedGroups.push({
        groupId: group.id,
        serviceId: group.serviceId,
        name: group.name,
        namespace: group.namespace,
        headers: group.headers,
        enabled: group.enabled,
        operations: parsedOps,
      });
    }

    setBusyConfirm(true);
    try {
      const result = await api<{ groups: Array<{ service: Service }> }>(
        "/api/admin/imports/confirm",
        {
          method: "POST",
          body: JSON.stringify({ previewId, groups: parsedGroups }),
        },
      );
      toast.success(`导入完成，共保存 ${result.groups.length} 个服务`);
      onSaved(result.groups.map((item) => item.service));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyConfirm(false);
    }
  };

  const selectedTotal = groups.reduce(
    (sum, group) => sum + group.operations.filter((op) => op.checked).length,
    0,
  );

  return (
    <div className="flex flex-col gap-5 pb-16">
      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      <ImportSourceForm
        kind={kind}
        mode={mode}
        text={text}
        url={url}
        baseUrl={baseUrl}
        file={file}
        busyPreview={busyPreview}
        onModeChange={(nextMode) =>
          guardSourceChange("切换输入方式将清空当前解析预览与未保存草稿", () => {
            setMode(nextMode);
            setFile(null);
            clearPreview();
          })
        }
        onTextChange={(nextText) =>
          guardSourceChange("修改导入原文将使当前预览失效", () => {
            setText(nextText);
            clearPreview();
          })
        }
        onUrlChange={(nextUrl) =>
          guardSourceChange("修改文档 URL 将使当前预览失效", () => {
            setUrl(nextUrl);
            clearPreview();
          })
        }
        onBaseUrlChange={(nextBase) =>
          guardSourceChange("修改基址将使当前预览失效", () => {
            setBaseUrl(nextBase);
            clearPreview();
          })
        }
        onFileChange={(nextFile) =>
          guardSourceChange("更换上传文件将使当前预览失效", () => {
            setFile(nextFile);
            clearPreview();
          })
        }
        onFileError={setError}
        onPreview={() => void runPreview()}
      />

      {groups.map((group, index) => (
        <ImportTargetGroupCard
          key={group.id}
          group={group}
          index={index}
          matchingServices={services.filter((service) => sameTarget(service, group.url))}
          busy={busyPreview || busyConfirm}
          highlightedOpId={highlightedOpId}
          onSelectTarget={(serviceId) => {
            const choices = { ...targets, [group.url]: serviceId };
            setTargets(choices);
            void runPreview(choices, true);
          }}
          onChangeGroup={(change) => changeGroup(group.id, change)}
          onHeaderErrorChange={(msg) => setHeaderErrors((prev) => ({ ...prev, [group.id]: msg }))}
          onUpdateOperation={(opId, patch) => updateOperation(group.id, opId, patch)}
        />
      ))}

      {previewId && (
        <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3.5 border-t border-[#E2E5EC] bg-white/95 backdrop-blur flex items-center justify-between gap-4">
          <span className="text-[13px] text-[#4B5563] tabular-nums">
            共 {groups.length} 个目标服务，已勾选 {selectedTotal} 个操作
          </span>
          <Button
            variant="primary"
            disabled={busyPreview || selectedTotal === 0}
            loading={busyConfirm}
            onClick={() => void confirm()}
          >
            {busyConfirm ? "导入中…" : "确认导入"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        tone="warning"
        title="丢弃未保存的编辑草稿？"
        description={pendingAction?.label}
        confirmLabel="继续修改"
        onConfirm={() => {
          const run = pendingAction?.run;
          setPendingAction(null);
          run?.();
        }}
      />
    </div>
  );
}
