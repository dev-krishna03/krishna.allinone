'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface PermissionItem {
  id: string;
  module: string;
  resource: string;
  action: string;
  sensitivity: string;
  label: string;
  description?: string;
}

interface MemberItem {
  id: string;
  role: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface EffectiveAccessSummary {
  memberId: string;
  roles: {
    id: string;
    name: string;
    code: string;
    permissions: {
      permissionId: string;
      module: string;
      resource: string;
      action: string;
      sensitivity: string;
      recordScope: string;
    }[];
  }[];
  teams: {
    id: string;
    name: string;
    code: string;
    isLead: boolean;
  }[];
}

export default function PermissionsMatrixPage() {
  const [groupedPermissions, setGroupedPermissions] = React.useState<Record<string, PermissionItem[]>>({});
  const [members, setMembers] = React.useState<MemberItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>('');
  const [effectiveAccess, setEffectiveAccess] = React.useState<EffectiveAccessSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingEffective, setLoadingEffective] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getOrgId = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('organizationId') || '';
    }
    return '';
  };

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const orgId = getOrgId();
    return {
      'Content-Type': 'application/json',
      'x-organization-id': orgId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      let targetOrgId = getOrgId();

      if (!targetOrgId) {
        const meRes = await fetch('http://localhost:3001/api/v1/me', { headers: getHeaders() });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.organization?.id) {
            targetOrgId = meData.organization.id;
            sessionStorage.setItem('organizationId', targetOrgId);
          }
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-organization-id': targetOrgId,
        ...(typeof window !== 'undefined' && sessionStorage.getItem('accessToken')
          ? { Authorization: `Bearer ${sessionStorage.getItem('accessToken')}` }
          : {}),
      };

      const [catRes, membersRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/permissions/catalog', { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/members`, { headers }),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setGroupedPermissions(catData.grouped || {});
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
        if (membersData.length > 0) {
          setSelectedMemberId(membersData[0].id);
          await fetchEffectiveAccess(targetOrgId, membersData[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchEffectiveAccess = async (orgId: string, memberId: string) => {
    try {
      setLoadingEffective(true);
      const res = await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/policy/effective-access?memberId=${memberId}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        setEffectiveAccess(await res.json());
      }
    } catch (err: any) {
      console.error('Failed to load effective access:', err);
    } finally {
      setLoadingEffective(false);
    }
  };

  React.useEffect(() => {
    fetchInitialData();
  }, []);

  const handleMemberChange = async (memberId: string) => {
    setSelectedMemberId(memberId);
    const orgId = getOrgId();
    if (orgId && memberId) {
      await fetchEffectiveAccess(orgId, memberId);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Top Bar */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-xs font-semibold text-[#625F59] hover:text-[#C15F3C]">
              ← Dashboard
            </Link>
            <span className="text-xs text-[#8A867D]">/</span>
            <h1 className="font-bold text-sm text-[#141413]">Permission Catalog & Access Matrix</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Permission Matrix & Authorization Registry</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Standard platform actions, sensitivity classifications, and real-time effective permission matrices for any member.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Member Effective Access Inspector */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#E8E6DC] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#141413]">Effective Member Authorization Inspector</h3>
              <p className="text-xs text-[#625F59] mt-0.5">
                Inspect calculated effective rights combining system role tier, custom roles, team hierarchy and scopes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#141413]">Select Member:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.fullName} ({m.user?.email}) - {m.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingEffective ? (
            <p className="text-xs text-[#625F59] py-6 text-center">Calculating effective access matrix...</p>
          ) : effectiveAccess ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[#625F59]">Assigned Custom Roles: </span>
                  {effectiveAccess.roles.length > 0 ? (
                    effectiveAccess.roles.map((r) => (
                      <span
                        key={r.id}
                        className="ml-1 px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E6DC] font-semibold text-[#141413]"
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#8A867D] italic">Default system role tier only</span>
                  )}
                </div>

                <div className="border-l border-[#E8E6DC] pl-4">
                  <span className="text-[#625F59]">Teams: </span>
                  {effectiveAccess.teams.length > 0 ? (
                    effectiveAccess.teams.map((t) => (
                      <span
                        key={t.id}
                        className="ml-1 px-2 py-0.5 rounded bg-[#F4F3EE] border border-[#E8E6DC] text-[#141413]"
                      >
                        {t.name} {t.isLead ? '(Lead)' : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#8A867D] italic">None</span>
                  )}
                </div>
              </div>

              {/* Resolved Permissions Table */}
              <div className="overflow-x-auto border border-[#E8E6DC] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F5]">
                    <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                      <th className="py-2.5 px-3 font-semibold">Granted Role</th>
                      <th className="py-2.5 px-3 font-semibold">Module</th>
                      <th className="py-2.5 px-3 font-semibold">Resource</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-3 font-semibold">Sensitivity</th>
                      <th className="py-2.5 px-3 font-semibold">Record Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DC]">
                    {effectiveAccess.roles.flatMap((r) =>
                      r.permissions.map((p) => (
                        <tr key={`${r.id}-${p.permissionId}`} className="hover:bg-[#FAF9F5]">
                          <td className="py-2 px-3 font-medium text-[#141413]">{r.name}</td>
                          <td className="py-2 px-3 text-[#625F59] uppercase text-[10px] tracking-wider">{p.module}</td>
                          <td className="py-2 px-3 font-mono text-[#141413]">{p.resource}</td>
                          <td className="py-2 px-3 font-mono text-[#C15F3C] font-semibold">{p.action}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                p.sensitivity === 'CRITICAL'
                                  ? 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20'
                                  : p.sensitivity === 'SENSITIVE'
                                  ? 'bg-[#996000]/10 text-[#996000] border-[#996000]/20'
                                  : 'bg-[#FAF9F5] text-[#625F59] border-[#E8E6DC]'
                              }`}
                            >
                              {p.sensitivity}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-[#141413] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#E8E6DC]">
                              {p.recordScope}
                            </span>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#625F59] py-4 text-center">No member selected</p>
          )}
        </div>

        {/* Platform Canonical Permission Registry by Module */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#141413]">Canonical Platform Permission Registry</h3>
            <p className="text-xs text-[#625F59] mt-0.5">
              Built-in permission definitions across all Unified Business OS modules.
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
              <div key={moduleName} className="border border-[#E8E6DC] rounded-lg overflow-hidden">
                <div className="bg-[#FAF9F5] px-4 py-2 border-b border-[#E8E6DC] flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#141413] uppercase tracking-wider">
                    Module: {moduleName}
                  </h4>
                  <span className="text-[11px] text-[#625F59] font-medium">
                    {perms.length} Permissions Registered
                  </span>
                </div>
                <div className="divide-y divide-[#E8E6DC]">
                  {perms.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex items-start justify-between gap-4 hover:bg-[#FAF9F5] transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#141413]">{p.label}</div>
                        <div className="text-[11px] text-[#625F59] mt-0.5">{p.description}</div>
                        <div className="mt-1 font-mono text-[10px] text-[#8A867D]">
                          grant key: {p.module}:{p.resource}:{p.action}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          p.sensitivity === 'CRITICAL'
                            ? 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20'
                            : p.sensitivity === 'SENSITIVE'
                            ? 'bg-[#996000]/10 text-[#996000] border-[#996000]/20'
                            : 'bg-[#476B3C]/10 text-[#476B3C] border-[#476B3C]/20'
                        }`}
                      >
                        {p.sensitivity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
