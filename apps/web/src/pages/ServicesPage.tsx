import { useState } from "react";
import { Plus, RefreshCw, Server, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "../lib/api";
import { useServicesCatalog, type KindFilter, type StatusFilter } from "../hooks/useServicesCatalog";
import { PageHeader } from "../components/layout/PageHeader";
import { FilterToolbar } from "../components/layout/FilterToolbar";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  cn,
} from "../components/ui";
import { ServiceCard } from "../components/domain/ServiceCard";
import { ServiceDrawer } from "../components/domain/ServiceDrawer";
import { ServiceEditorModal } from "../components/domain/ServiceEditorModal";
import { ServiceOnboardingDrawer } from "../components/domain/ServiceOnboardingDrawer";
import { SyncPreviewModal } from "../components/domain/SyncPreviewModal";
import type { Service } from "../types";

export function ServicesPage({ isAdmin = true }: { isAdmin?: boolean }) {
  const readOnly = !isAdmin;
  const catalog = useServicesCatalog(isAdmin);
  const [onboarding, setOnboarding] = useState<{ open: boolean; sessionKey: number; target?: Service }>({
    open: false,
    sessionKey: 0,
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [importBanner, setImportBanner] = useState<{ message: string; services: Service[] } | null>(null);

  const confirmDeleteService = async () => {
    if (!deleteTarget) return;
    setBusyDelete(true);
    try {
      await api(`/api/admin/services/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`已删除服务 ${deleteTarget.name}`);
      if (catalog.selectedId === deleteTarget.id) catalog.setSelectedId(null);
      setImportBanner((prev) =>
        prev
          ? {
              ...prev,
              services: prev.services.filter((item) => item.id !== deleteTarget.id),
            }
          : null,
      );
      setDeleteTarget(null);
      await catalog.loadServices();
    } catch (reason) {
      toast.error(errorMessage(reason));
    } finally {
      setBusyDelete(false);
    }
  };

  const openNewOnboarding = () => {
    setImportBanner(null);
    setOnboarding((prev) => ({ open: true, sessionKey: prev.sessionKey + 1 }));
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        title="MCP 服务"
        description="统一管理服务与工具，通过原生 MCP 或 REST API 接入，在角色与授权页面分配访问权限。"
        actions={isAdmin ? (
          <>
            <Button
              variant="secondary"
              disabled={catalog.refreshingList}
              onClick={() => void catalog.loadServices(catalog.selectedId)}
              aria-label="刷新服务"
            >
              <RefreshCw
                size={14}
                strokeWidth={1.75}
                className={cn(catalog.refreshingList && "animate-spin")}
              />
              <span>刷新服务</span>
            </Button>
            <Button variant="primary" onClick={openNewOnboarding}>
              <Plus size={14} strokeWidth={1.75} />
              <span>接入服务</span>
            </Button>
          </>
        ) : undefined}
      />

      {importBanner && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#15803D]"
        >
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="font-medium">{importBanner.message}</span>
            {importBanner.services.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="本次导入的服务">
                {importBanner.services.map((service) => (
                  <Button
                    key={service.id}
                    size="sm"
                    variant={catalog.selectedId === service.id ? "primary" : "secondary"}
                    aria-pressed={catalog.selectedId === service.id}
                    onClick={() => catalog.setSelectedId(service.id)}
                  >
                    查看 {service.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="关闭导入结果提示"
            onClick={() => setImportBanner(null)}
            className="inline-grid place-items-center h-6 w-6 rounded hover:bg-[#DCFCE7] cursor-pointer"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {catalog.listError ? (
        <EmptyState
          title="无法加载服务列表"
          description={catalog.listError}
          action={
            <Button variant="primary" onClick={() => void catalog.loadServices(catalog.selectedId)}>
              重试
            </Button>
          }
        />
      ) : (
        <>
          <FilterToolbar
            left={
              <>
                <SearchInput
                  value={catalog.search}
                  onValueChange={catalog.setSearch}
                  placeholder="搜索名称、命名空间、URL 或说明…"
                  className="w-80 max-[768px]:w-full"
                />
                <SegmentedControl<KindFilter>
                  aria-label="按接入方式筛选"
                  value={catalog.kindFilter}
                  onValueChange={catalog.setKindFilter}
                  options={[
                    { value: "all", label: "全部", count: catalog.services.length },
                    {
                      value: "mcp",
                      label: "原生 MCP",
                      count: catalog.services.filter((s) => s.kind === "mcp").length,
                    },
                    {
                      value: "rest",
                      label: "REST API",
                      count: catalog.services.filter((s) => s.kind === "rest").length,
                    },
                  ]}
                />
                <Select<StatusFilter>
                  aria-label="按状态筛选"
                  value={catalog.statusFilter}
                  onValueChange={catalog.setStatusFilter}
                  options={[
                    { value: "all", label: "全部状态" },
                    { value: "enabled", label: "已启用" },
                    { value: "disabled", label: "未启用" },
                    { value: "error", label: "连接异常" },
                  ]}
                />
              </>
            }
            right={
              <span className="text-[12px] text-[#5B6270] tabular-nums">
                显示 {catalog.filteredServices.length} / {catalog.services.length} 个服务
              </span>
            }
          />

          {catalog.loadingList ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : catalog.services.length === 0 ? (
            <EmptyState
              icon={<Server size={20} strokeWidth={1.75} />}
              title="尚未登记任何服务"
              description="接入原生 MCP 服务，或通过手工定义、OpenAPI、cURL 将 REST API 映射为 MCP 工具。"
              action={isAdmin ? (
                <Button variant="primary" onClick={openNewOnboarding}>
                  <Plus size={14} strokeWidth={1.75} />
                  <span>接入第一个服务</span>
                </Button>
              ) : undefined}
            />
          ) : catalog.filteredServices.length === 0 ? (
            <EmptyState
              title="没有匹配当前筛选条件的服务"
              description="请尝试调整搜索词或状态筛选条件。"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    catalog.setSearch("");
                    catalog.setKindFilter("all");
                    catalog.setStatusFilter("all");
                  }}
                >
                  重置筛选
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              {catalog.filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={catalog.selectedId === service.id}
                  toggling={catalog.togglingId === service.id}
                  onOpenDetail={(item) => catalog.setSelectedId(item.id)}
                  onToggleEnabled={(item, next) => void catalog.toggleEnabled(item, next)}
                  onEdit={(item) => setEditingService(item)}
                  onTestConnection={(item) => void catalog.testConnection(item)}
                  onSyncTools={(item) => {
                    catalog.setSelectedId(item.id);
                    void catalog.syncPreview(item.id);
                  }}
                  onImportTools={(item) =>
                    setOnboarding((prev) => ({
                      open: true,
                      sessionKey: prev.sessionKey + 1,
                      target: item,
                    }))
                  }
                  onRequestDelete={(item) => setDeleteTarget(item)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ServiceDrawer
        service={catalog.selectedService}
        tools={catalog.tools}
        loadingTools={catalog.loadingTools}
        busyAction={catalog.drawerBusyAction}
        externalModalOpen={
          Boolean(editingService) || onboarding.open || catalog.syncModal.open || Boolean(deleteTarget)
        }
        onClose={() => catalog.setSelectedId(null)}
        onToggleEnabled={(item, next) => void catalog.toggleEnabled(item, next)}
        onEdit={(item) => setEditingService(item)}
        onTestConnection={(item) => void catalog.testConnection(item)}
        onSyncTools={(item) => void catalog.syncPreview(item.id)}
        onImportTools={(item) =>
          setOnboarding((prev) => ({
            open: true,
            sessionKey: prev.sessionKey + 1,
            target: item,
          }))
        }
        onRequestDelete={(item) => setDeleteTarget(item)}
        onToolsChanged={async () => {
          await Promise.all([
            catalog.loadToolsFor(catalog.selectedId),
            catalog.loadServices(catalog.selectedId),
          ]);
        }}
        readOnly={readOnly}
      />

      {isAdmin && <ServiceEditorModal
        service={editingService}
        onClose={() => setEditingService(null)}
        onSaved={(saved) => {
          setEditingService(null);
          toast.success(`已保存服务 ${saved.name}`);
          void catalog.loadServices(saved.id);
        }}
      />}

      {isAdmin && <ServiceOnboardingDrawer
        open={onboarding.open}
        sessionKey={onboarding.sessionKey}
        target={onboarding.target}
        onClose={() => setOnboarding((prev) => ({ ...prev, open: false }))}
        onSaved={(saved, imported) => {
          setOnboarding((prev) => ({ ...prev, open: false }));
          const first = saved[0];
          catalog.setSelectedId(first.id);
          if (imported) {
            setImportBanner({
              message: `导入完成，共保存 ${saved.length} 个服务。请在角色与授权页面分配工具权限。`,
              services: saved,
            });
          } else {
            setImportBanner(null);
            toast.success(`服务 ${first.name} 已保存`);
          }
          void Promise.all([catalog.loadServices(first.id), catalog.loadToolsFor(first.id)]);
        }}
      />}

      {isAdmin && <SyncPreviewModal
        open={catalog.syncModal.open}
        preview={catalog.syncModal.preview}
        existingTools={catalog.tools}
        busy={catalog.syncModal.busy}
        staleError={catalog.syncModal.staleError}
        error={catalog.syncModal.error}
        onConfirm={() => void catalog.confirmSync()}
        onRedetect={() => void catalog.syncPreview(catalog.syncModal.serviceId)}
        onClose={catalog.closeSyncModal}
      />}

      {isAdmin && <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        tone="danger"
        title="删除服务"
        description="确认永久删除该服务吗？此操作无法撤销。"
        entity={deleteTarget?.name}
        consequences={[
          "立即断开下游连接并移除该服务下全部工具定义",
          "清理关联的角色授权配置",
          "保留历史正式调用审计与统计记录",
        ]}
        confirmLabel="确认删除"
        busy={busyDelete}
        onConfirm={confirmDeleteService}
      />}
    </section>
  );
}
