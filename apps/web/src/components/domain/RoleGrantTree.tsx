import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Lock, Sparkles } from "lucide-react";
import { connectionKindLabels, type Resource, type Service } from "../../types";
import { Badge, Button, EmptyState, Switch } from "../ui";

export interface RoleGrantTreeProps {
  services: Service[];
  resources: Resource[];
  grants: string[];
  toolSearch: string;
  onlyGranted: boolean;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (serviceId: string) => void;
  onChangeGrants: (nextGrants: string[]) => void;
}

/** Hierarchical service -> tools authorization tree plus restricted/public skills split. */
export function RoleGrantTree({
  services,
  resources,
  grants,
  toolSearch,
  onlyGranted,
  expandedIds,
  onToggleExpand,
  onChangeGrants,
}: RoleGrantTreeProps) {
  const [publicSkillsOpen, setPublicSkillsOpen] = useState(false);

  const grantSet = useMemo(() => new Set(grants), [grants]);
  const q = toolSearch.trim().toLowerCase();

  const { serviceGroups, restrictedSkills, publicSkills } = useMemo(() => {
    const toolsByService = new Map<string, Resource[]>();
    const restricted: Resource[] = [];
    const pub: Resource[] = [];

    for (const res of resources) {
      if (res.type === "tool" && res.parentId) {
        const list = toolsByService.get(res.parentId) ?? [];
        list.push(res);
        toolsByService.set(res.parentId, list);
      } else if (res.type === "skill") {
        if (res.visibility === "public") pub.push(res);
        else restricted.push(res);
      }
    }

    const groups = services
      .map((service) => {
        const allTools = toolsByService.get(service.id) ?? [];
        const visibleTools = allTools.filter((tool) => {
          if (onlyGranted && !grantSet.has(tool.id)) return false;
          if (q && !tool.name.toLowerCase().includes(q) && !tool.description.toLowerCase().includes(q)) {
            return false;
          }
          return true;
        });
        const grantedToolCount = allTools.filter((tool) => grantSet.has(tool.id)).length;
        const serviceMatch = !q || service.name.toLowerCase().includes(q) || service.namespace.toLowerCase().includes(q);
        const matchesFilter =
          visibleTools.length > 0 ||
          (!onlyGranted && serviceMatch) ||
          (onlyGranted && grantSet.has(service.id));

        return {
          service,
          allTools,
          visibleTools,
          grantedToolCount,
          matchesFilter,
        };
      })
      .filter((group) => group.matchesFilter);

    const filterSkill = (skill: Resource) =>
      (!onlyGranted || skill.visibility === "public" || grantSet.has(skill.id)) &&
      (!q || skill.name.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q));

    return {
      serviceGroups: groups,
      restrictedSkills: restricted.filter(filterSkill),
      publicSkills: pub.filter(filterSkill),
    };
  }, [services, resources, grantSet, onlyGranted, q]);

  const toggleTool = (serviceId: string, serviceTools: Resource[], toolId: string) => {
    const next = new Set(grantSet);
    if (next.has(toolId)) {
      next.delete(toolId);
      const remainingTools = serviceTools.some((t) => next.has(t.id));
      if (!remainingTools) {
        next.delete(serviceId);
      }
    } else {
      next.add(toolId);
    }
    onChangeGrants([...next]);
  };

  const selectAllTools = (serviceTools: Resource[]) => {
    const next = new Set(grantSet);
    for (const tool of serviceTools) {
      next.add(tool.id);
    }
    onChangeGrants([...next]);
  };

  const clearServiceGroup = (serviceId: string, serviceTools: Resource[]) => {
    const next = new Set(grantSet);
    next.delete(serviceId);
    for (const tool of serviceTools) {
      next.delete(tool.id);
    }
    onChangeGrants([...next]);
  };

  const toggleEmptyDir = (serviceId: string, allow: boolean) => {
    const next = new Set(grantSet);
    if (allow) next.add(serviceId);
    else next.delete(serviceId);
    onChangeGrants([...next]);
  };

  const toggleSkill = (skillId: string) => {
    const next = new Set(grantSet);
    if (next.has(skillId)) next.delete(skillId);
    else next.add(skillId);
    onChangeGrants([...next]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-semibold text-[#111827]">MCP 服务与工具</h3>

        {serviceGroups.length === 0 ? (
          <EmptyState
            title="没有符合筛选条件的服务或工具"
            description="尝试清空工具搜索词或关闭「仅看已授权」过滤。"
          />
        ) : (
          serviceGroups.map(({ service, allTools, visibleTools, grantedToolCount }) => {
            const expanded = expandedIds[service.id] ?? true;
            const directoryOnlyGranted = grantedToolCount === 0 && grantSet.has(service.id);

            return (
              <div
                key={service.id}
                className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white shadow-[var(--shadow-xs)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F5F6F8]/70 border-b border-[#E2E5EC]">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(service.id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                  >
                    {expanded ? (
                      <ChevronDown size={15} strokeWidth={1.75} className="text-[#4B5563] shrink-0" />
                    ) : (
                      <ChevronRight size={15} strokeWidth={1.75} className="text-[#4B5563] shrink-0" />
                    )}
                    <strong className="text-[14px] font-semibold text-[#111827] truncate">
                      {service.name}
                    </strong>
                    <Badge tone={service.kind === "mcp" ? "info" : "neutral"}>
                      {connectionKindLabels[service.kind]}
                    </Badge>
                    <Badge tone={service.enabled ? "ok" : "neutral"}>
                      {service.enabled ? "已启用" : "未启用"}
                    </Badge>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="font-mono text-[12px] text-[#4B5563] tabular-nums">
                      {grantedToolCount} / {allTools.length}
                    </span>
                    {allTools.length > 0 && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => selectAllTools(allTools)}>
                          全选工具
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => clearServiceGroup(service.id, allTools)}
                        >
                          清空
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="flex flex-col divide-y divide-[#EEF0F4]">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white text-[12px] text-[#4B5563]">
                      {grantedToolCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[#15803D] font-medium">
                          目录自动可见（已授权 {grantedToolCount} 个子工具）
                        </span>
                      ) : (
                        <>
                          <span>未勾选子工具；勾选服务目录仅展示空服务条目，不开放调用权。</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={directoryOnlyGranted}
                              aria-label={`${service.name} 仅开放空目录`}
                              onCheckedChange={(checked) => toggleEmptyDir(service.id, checked)}
                            />
                            <span className="text-[12px] text-[#111827]">仅开放空目录（不含工具调用）</span>
                          </div>
                        </>
                      )}
                    </div>

                    {visibleTools.length === 0 ? (
                      <p className="px-4 py-3 text-[12px] text-[#5B6270]">
                        {allTools.length === 0 ? "该服务暂无已确认工具" : "当前筛选下无匹配工具"}
                      </p>
                    ) : (
                      visibleTools.map((tool) => (
                        <label
                          key={tool.id}
                          className="flex items-start gap-3 pl-9 pr-4 py-2.5 hover:bg-[#F5F6F8]/60 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={grantSet.has(tool.id)}
                            onChange={() => toggleTool(service.id, allTools, tool.id)}
                            className="mt-0.5 h-4 w-4 accent-[#18181B] cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[13px] font-medium text-[#111827] break-all">
                              {tool.name}
                            </div>
                            {tool.description && (
                              <div className="text-[12px] text-[#5B6270] mt-0.5 line-clamp-2">
                                {tool.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {(restrictedSkills.length > 0 || publicSkills.length > 0) && (
        <div className="flex flex-col gap-3 pt-2 border-t border-[#E2E5EC]">
          <h3 className="text-[14px] font-semibold text-[#111827]">Agent Skills 授权</h3>

          {restrictedSkills.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white divide-y divide-[#EEF0F4]">
              <div className="px-4 py-2.5 bg-[#F5F6F8]/70 flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                <Lock size={14} strokeWidth={1.75} className="text-[#4B5563]" />
                <span>受限技能（需显式授予角色）</span>
              </div>
              {restrictedSkills.map((skill) => (
                <label
                  key={skill.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#F5F6F8]/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={grantSet.has(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="mt-0.5 h-4 w-4 accent-[#18181B] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#111827]">{skill.name}</div>
                    {skill.description && (
                      <div className="text-[12px] text-[#5B6270] mt-0.5">{skill.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {publicSkills.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[#E2E5EC] bg-white">
              <button
                type="button"
                onClick={() => setPublicSkillsOpen((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-[12px] font-medium text-[#4B5563] hover:text-[#111827] cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={14} strokeWidth={1.75} />
                  <span>公开技能（{publicSkills.length} 项 · 默认对所有用户只读可见）</span>
                </span>
                {publicSkillsOpen ? (
                  <ChevronDown size={14} strokeWidth={1.75} />
                ) : (
                  <ChevronRight size={14} strokeWidth={1.75} />
                )}
              </button>
              {publicSkillsOpen && (
                <div className="divide-y divide-[#EEF0F4] border-t border-[#E2E5EC]">
                  {publicSkills.map((skill) => (
                    <div key={skill.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-medium text-[#111827]">{skill.name}</div>
                        {skill.description && (
                          <div className="text-[12px] text-[#5B6270]">{skill.description}</div>
                        )}
                      </div>
                      <Badge tone="ok">公开只读</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
