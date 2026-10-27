'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface RoleItem {
  id: string;
  name: string;
  code: string;
  isBuiltIn: boolean;
  description?: string;
  memberCount: number;
  permissionCount: number;
  parentRole?: { id: string; name: string; code: string } | null;
  permissions?: {
    id: string;
    permissionId: string;
    recordScope: string;
    permission?: {
      id: string;
      module: string;
      resource: string;
      action: string;
      label: string;
    };
  }[];
}

interface PlatformPermission {
  id: string;
  module: string;
  resource: string;
  action: string;
  label: string;
  sensitivity: string;
  description?: string;
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [catalog, setCatalog] = React.useState<PlatformPermission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null);
  const [roleName, setRoleName] = React.useState('');
  const [roleCode, setRoleCode] = React.useState('');
  const [roleDesc, setRoleDesc] = React.useState('');
  const [parentRoleId, setParentRoleId] = React.useState('');
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    Record<string, { enabled: boolean; scope: string }>
  >({});
  const [saving, setSaving] = React.useState(false);

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

  const fetchData = async () => {
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

      if (!targetOrgId) {
        throw new Error('Organization context not found');
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-organization-id': targetOrgId,
        ...(typeof window !== 'undefined' && sessionStorage.getItem('accessToken')
          ? { Authorization: `Bearer ${sessionStorage.getItem('accessToken')}` }
          : {}),
      };

      const [rolesRes, catRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/roles`, { headers }),
        fetch('http://localhost:3001/api/v1/permissions/catalog', { headers }),
      ]);

      if (!rolesRes.ok) throw new Error('Failed to load roles');
      const rolesData = await rolesRes.json();
      setRoles(rolesData);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalog(catData.permissions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching roles');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSeedDefaults = async () => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/roles/seed-defaults`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to initialize default roles');
      setMessage('Standard system roles successfully seeded');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingRoleId(null);
    setRoleName('');
    setRoleCode('');
    setRoleDesc('');
    setParentRoleId('');
    setSelectedPermissions({});
    setShowModal(true);
  };

  const handleOpenEdit = async (role: RoleItem) => {
    setIsEditing(true);
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleCode(role.code);
    setRoleDesc(role.description || '');
    setParentRoleId(role.parentRole?.id || '');

    const currentPerms: Record<string, { enabled: boolean; scope: string }> = {};
    if (role.permissions) {
      for (const p of role.permissions) {
        currentPerms[p.permissionId] = {
          enabled: true,
          scope: p.recordScope || 'ALL',
        };
      }
    }
    setSelectedPermissions(currentPerms);
    setShowModal(true);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) => {
      const cur = prev[permId];
      if (cur?.enabled) {
        const copy = { ...prev };
        delete copy[permId];
        return copy;
      }
      return {
        ...prev,
        [permId]: { enabled: true, scope: 'ALL' },
      };
    });
  };

  const handleScopeChange = (permId: string, scope: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permId]: { enabled: true, scope },
    }));
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    try {
      setSaving(true);
      const orgId = getOrgId();

      const permsArray = Object.entries(selectedPermissions)
        .filter(([_, v]) => v.enabled)
        .map(([permId, v]) => ({
          permissionId: permId,
          recordScope: v.scope,
        }));

      if (isEditing && editingRoleId) {
        const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/roles/${editingRoleId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            name: roleName,
            description: roleDesc,
            parentRoleId: parentRoleId || null,
            permissions: permsArray,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to update role');
        }
        setMessage(`Role "${roleName}" updated successfully`);
      } else {
        const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/roles`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            name: roleName,
            code: roleCode || undefined,
            description: roleDesc,
            parentRoleId: parentRoleId || null,
            permissions: permsArray,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to create role');
        }
        setMessage(`Custom role "${roleName}" created successfully`);
      }

      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete role');
      }

      setMessage(`Role "${roleName}" deleted`);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
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
            <h1 className="font-bold text-sm text-[#141413]">Role-Based Access Control (RBAC)</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDefaults}
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413] transition-colors"
            >
              Seed Standard Roles
            </button>
            <button
              onClick={handleOpenCreate}
              className="rounded-md bg-[#C15F3C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors"
            >
              + Create Role
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Workspace Roles & Permissions</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Configure custom roles, Zoho-style hierarchical inheritance, and granular record scopes (Owner-Only, Team, Department, All).
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-md bg-[#476B3C]/10 border border-[#476B3C]/20 text-xs text-[#476B3C]">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Roles Grid */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">Configured Roles</h3>
            <span className="text-xs text-[#625F59] bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC]">
              {roles.length} Roles Active
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-[#625F59] py-8 text-center">Loading security roles...</p>
          ) : roles.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-[#625F59]">No roles configured yet.</p>
              <button
                onClick={handleSeedDefaults}
                className="mt-3 text-xs text-[#C15F3C] font-semibold hover:underline"
              >
                Click here to seed standard roles
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                    <th className="py-2.5 px-3 font-semibold">Role Name</th>
                    <th className="py-2.5 px-3 font-semibold">Code</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Parent Role (Hierarchy)</th>
                    <th className="py-2.5 px-3 font-semibold">Assigned Members</th>
                    <th className="py-2.5 px-3 font-semibold">Permissions</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#141413]">{r.name}</div>
                        {r.description && (
                          <div className="text-[11px] text-[#625F59] line-clamp-1">{r.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <code className="text-[11px] bg-[#F4F3EE] px-1.5 py-0.5 rounded border border-[#E8E6DC] text-[#141413]">
                          {r.code}
                        </code>
                      </td>
                      <td className="py-3 px-3">
                        {r.isBuiltIn ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#2F5C83]/10 text-[#2F5C83] border border-[#2F5C83]/20">
                            Built-in System
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#476B3C]/10 text-[#476B3C] border border-[#476B3C]/20">
                            Custom Role
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.parentRole ? (
                          <span className="text-[11px] text-[#141413] font-medium">
                            ↳ {r.parentRole.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8A867D]">None (Root)</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#141413]">{r.memberCount} members</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#E8E6DC] text-[11px] font-medium text-[#141413]">
                          {r.permissionCount} grants
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="text-[#C15F3C] font-semibold hover:underline"
                        >
                          Edit Grants
                        </button>
                        {!r.isBuiltIn && (
                          <button
                            onClick={() => handleDeleteRole(r.id, r.name)}
                            className="text-[#B42318] hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">
                {isEditing ? `Edit Role: ${roleName}` : 'Create New Security Role'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-[#625F59] hover:text-[#141413]"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSubmitRole} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141413] mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Regional Sales Lead"
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141413] mb-1">Role Code</label>
                  <input
                    type="text"
                    disabled={isEditing}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder="auto_generated_from_name"
                    className="w-full rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">
                  Parent Role (Inheritance Hierarchy)
                </label>
                <select
                  value={parentRoleId}
                  onChange={(e) => setParentRoleId(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                >
                  <option value="">No Parent (Root level)</option>
                  {roles
                    .filter((r) => r.id !== editingRoleId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-[#625F59] mt-1">
                  Child roles automatically inherit all permissions granted to their parent role.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Description</label>
                <textarea
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Describe the responsibility and scope of this role..."
                  rows={2}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                />
              </div>

              {/* Permissions Checklist & Scope selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#141413]">
                  Permissions & Record Scopes
                </label>
                <div className="border border-[#E8E6DC] rounded-lg max-h-64 overflow-y-auto divide-y divide-[#E8E6DC] p-2 bg-[#FAF9F5]">
                  {catalog.map((perm) => {
                    const isSelected = Boolean(selectedPermissions[perm.id]?.enabled);
                    const scope = selectedPermissions[perm.id]?.scope || 'ALL';

                    return (
                      <div
                        key={perm.id}
                        className="p-2 flex items-center justify-between gap-4 hover:bg-white rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`perm-${perm.id}`}
                            checked={isSelected}
                            onChange={() => handleTogglePermission(perm.id)}
                            className="rounded border-[#E8E6DC] text-[#C15F3C] focus:ring-[#C15F3C]"
                          />
                          <div>
                            <label
                              htmlFor={`perm-${perm.id}`}
                              className="text-xs font-semibold text-[#141413] cursor-pointer"
                            >
                              {perm.label}
                            </label>
                            <span className="ml-2 text-[10px] text-[#625F59] font-mono">
                              {perm.module}:{perm.resource}:{perm.action}
                            </span>
                            {perm.description && (
                              <p className="text-[10px] text-[#625F59]">{perm.description}</p>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#625F59]">Scope:</span>
                            <select
                              value={scope}
                              onChange={(e) => handleScopeChange(perm.id, e.target.value)}
                              className="text-xs rounded border border-[#E8E6DC] bg-white px-2 py-1 text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                            >
                              <option value="ALL">ALL (Org-wide)</option>
                              <option value="DEPARTMENT">DEPARTMENT</option>
                              <option value="TEAM">TEAM</option>
                              <option value="OWNER_ONLY">OWNER_ONLY</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-[#E8E6DC] px-3.5 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#C15F3C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
