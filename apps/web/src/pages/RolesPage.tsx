import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Resource, Role, Service } from "../types";

export function RolesPage({ setError }: { setError: (error: string) => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [grants, setGrants] = useState<string[]>([]);
  const [roleName, setRoleName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [roleResult, resourceResult, serviceResult] = await Promise.all([
        api<{ roles: Role[] }>("/api/admin/roles"),
        api<{ resources: Resource[] }>("/api/admin/resources"),
        api<{ services: Service[] }>("/api/admin/services"),
      ]);
      const customRoles = roleResult.roles.filter((role) => !role.isAdmin);
      setRoles(customRoles);
      const serviceIds = new Set(serviceResult.services.map((service) => service.id));
      setResources(
        resourceResult.resources.filter(
          (resource) => resource.type === "skill" || serviceIds.has(resource.parentId ?? resource.id),
        ),
      );
      setSelectedRole((current) =>
        customRoles.some((role) => role.id === current) ? current : customRoles[0]?.id ?? "",
      );
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载角色");
    }
  }, [setError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedRole) {
      setGrants([]);
      return;
    }
    void api<{ resourceIds: string[] }>(`/api/admin/roles/${selectedRole}/resources`)
      .then((result) => setGrants(result.resourceIds))
      .catch(() => setGrants([]));
  }, [selectedRole]);

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await api<{ role: Role }>("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ name: roleName }),
      });
      setRoleName("");
      await load();
      setSelectedRole(result.role.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建角色失败");
    }
  };

  const saveGrants = async () => {
    setSaving(true);
    try {
      await api(`/api/admin/roles/${selectedRole}/resources`, {
        method: "PUT",
        body: JSON.stringify({ resourceIds: grants }),
      });
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存授权失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selectedRole) return;
    try {
      await api<void>(`/api/admin/roles/${selectedRole}`, { method: "DELETE" });
      setSelectedRole("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除角色失败");
    }
  };

  const toggleGrant = (resourceId: string) => {
    setGrants((current) =>
      current.includes(resourceId)
        ? current.filter((id) => id !== resourceId)
        : [...current, resourceId],
    );
  };

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-index">06</span>
            <span>授权策略</span>
          </p>
          <h1>角色与资源</h1>
          <p className="section-description">允许的资源同时对用户可见；未授权资源默认隐藏。</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void load()}
          aria-label="刷新角色"
          title="刷新"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>
      </div>

      <form className="inline-create role-create" onSubmit={(event) => void createRole(event)}>
        <label className="field-grow">
          新角色名称
          <input value={roleName} onChange={(event) => setRoleName(event.target.value)} required />
        </label>
        <button className="btn btn-primary">
          <Plus size={14} strokeWidth={1.5} />
          <span>创建角色</span>
        </button>
      </form>

      <div className="role-layout">
        <nav className="role-list" aria-label="角色列表">
          {roles.map((role) => (
            <button
              type="button"
              key={role.id}
              className={`role-nav-item ${selectedRole === role.id ? "selected" : ""}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <Shield size={14} strokeWidth={1.5} />
              <span>{role.name}</span>
            </button>
          ))}
          {!roles.length && <p className="muted role-empty">暂无自定义角色</p>}
        </nav>

        <div className="grant-panel">
          <div className="subsection-heading">
            <div>
              <h2>{roles.find((role) => role.id === selectedRole)?.name ?? "资源授权"}</h2>
              <p>按工具精确授权，多角色权限取并集；服务授权仅开放目录。</p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="icon-button danger-icon"
                onClick={() => void deleteRole()}
                disabled={!selectedRole}
                aria-label="删除角色"
                title="删除角色"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void saveGrants()}
                disabled={!selectedRole || saving}
              >
                {saving ? "保存中…" : "保存授权"}
              </button>
            </div>
          </div>

          <ResourceGroup
            title="MCP 服务与工具"
            resources={resources.filter((resource) => resource.type !== "skill")}
            grants={grants}
            onToggle={toggleGrant}
          />
          <ResourceGroup
            title="Agent Plugins / Skills"
            resources={resources.filter((resource) => resource.type === "skill")}
            grants={grants}
            onToggle={toggleGrant}
          />
        </div>
      </div>
    </section>
  );
}

function ResourceGroup({
  title,
  resources,
  grants,
  onToggle,
}: {
  title: string;
  resources: Resource[];
  grants: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="resource-group">
      <h3>{title}</h3>
      {resources.map((resource) => (
        <label key={resource.id} className="resource-row">
          <input
            type="checkbox"
            checked={resource.visibility === "public" || grants.includes(resource.id)}
            disabled={resource.visibility === "public"}
            onChange={() => onToggle(resource.id)}
          />
          <span className="badge badge-mono">
            {resource.type === "service"
              ? "服务"
              : resource.type === "tool"
                ? "工具"
                : resource.visibility === "public"
                  ? "公开"
                  : "特殊"}
          </span>
          <span className="resource-copy">
            <strong className={resource.type === "tool" ? "mono" : undefined}>{resource.name}</strong>
            <small>{resource.description}</small>
          </span>
        </label>
      ))}
      {!resources.length && <p className="muted">暂无资源</p>}
    </div>
  );
}
