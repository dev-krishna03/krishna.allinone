'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface TeamItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentTeamId?: string | null;
  leadMemberId?: string | null;
  memberCount: number;
  parentTeam?: { id: string; name: string; code: string } | null;
  childTeams?: { id: string; name: string; code: string }[];
  leadMember?: {
    id: string;
    user: { fullName: string; email: string };
  } | null;
  members?: {
    id: string;
    memberId: string;
    member: {
      id: string;
      user: { fullName: string; email: string };
    };
  }[];
}

interface OrgMember {
  id: string;
  role: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function TeamsSettingsPage() {
  const [teams, setTeams] = React.useState<TeamItem[]>([]);
  const [orgMembers, setOrgMembers] = React.useState<OrgMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Selected Team for detail/membership view
  const [selectedTeam, setSelectedTeam] = React.useState<TeamItem | null>(null);

  // Team Modal State
  const [showTeamModal, setShowTeamModal] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [teamName, setTeamName] = React.useState('');
  const [teamCode, setTeamCode] = React.useState('');
  const [parentTeamId, setParentTeamId] = React.useState('');
  const [leadMemberId, setLeadMemberId] = React.useState('');
  const [teamDesc, setTeamDesc] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = React.useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = React.useState('');

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

      const [teamsRes, membersRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/teams`, { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/members`, { headers }),
      ]);

      if (!teamsRes.ok) throw new Error('Failed to load teams');
      const teamsData = await teamsRes.json();
      setTeams(teamsData);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setOrgMembers(membersData);
      }

      // If a team is selected, refresh its details
      if (selectedTeam) {
        const refreshed = await fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/teams/${selectedTeam.id}`, { headers });
        if (refreshed.ok) {
          setSelectedTeam(await refreshed.json());
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching teams');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSelectTeam = async (team: TeamItem) => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/teams/${team.id}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        setSelectedTeam(await res.json());
      } else {
        setSelectedTeam(team);
      }
    } catch {
      setSelectedTeam(team);
    }
  };

  const handleOpenCreateTeam = () => {
    setIsEditing(false);
    setTeamName('');
    setTeamCode('');
    setParentTeamId('');
    setLeadMemberId('');
    setTeamDesc('');
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;

    try {
      setSaving(true);
      const orgId = getOrgId();

      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/teams`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: teamName,
          code: teamCode || undefined,
          parentTeamId: parentTeamId || null,
          leadMemberId: leadMemberId || null,
          description: teamDesc,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create team');
      }

      setMessage(`Team "${teamName}" created successfully`);
      setShowTeamModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"?`)) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/teams/${teamId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error('Failed to delete team');

      setMessage(`Team "${teamName}" deleted`);
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMemberToTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedMemberToAdd) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ memberId: selectedMemberToAdd }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add member to team');
      }

      setMessage('Member added to team');
      setShowAddMemberModal(false);
      setSelectedMemberToAdd('');
      await handleSelectTeam(selectedTeam);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMemberFromTeam = async (memberId: string) => {
    if (!selectedTeam) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/teams/${selectedTeam.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error('Failed to remove member from team');

      setMessage('Member removed from team');
      await handleSelectTeam(selectedTeam);
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
            <h1 className="font-bold text-sm text-[#141413]">Teams & Organizational Hierarchy</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateTeam}
              className="rounded-md bg-[#C15F3C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors"
            >
              + Create Team / Department
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Departments & Teams Hierarchy</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Organize members into functional teams and departments. Team leads enforce scoped ABAC permissions and record access policies.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teams List (2 columns on md) */}
          <div className="md:col-span-2 rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141413]">Organizational Units</h3>
              <span className="text-xs text-[#625F59] bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC]">
                {teams.length} Teams
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-[#625F59] py-8 text-center">Loading teams...</p>
            ) : teams.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-[#625F59]">No teams created yet.</p>
                <button
                  onClick={handleOpenCreateTeam}
                  className="mt-3 text-xs text-[#C15F3C] font-semibold hover:underline"
                >
                  Create your first team
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                      <th className="py-2.5 px-3 font-semibold">Team Name</th>
                      <th className="py-2.5 px-3 font-semibold">Parent Department</th>
                      <th className="py-2.5 px-3 font-semibold">Team Lead</th>
                      <th className="py-2.5 px-3 font-semibold">Members</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DC]">
                    {teams.map((t) => {
                      const isSelected = selectedTeam?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => handleSelectTeam(t)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#FAF9F5] border-l-2 border-l-[#C15F3C]' : 'hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#141413]">{t.name}</div>
                            <code className="text-[10px] text-[#625F59] bg-[#F4F3EE] px-1 rounded">
                              {t.code}
                            </code>
                          </td>
                          <td className="py-3 px-3">
                            {t.parentTeam ? (
                              <span className="text-[11px] font-medium text-[#141413]">
                                ↳ {t.parentTeam.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#8A867D]">Root Department</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {t.leadMember ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF9F5] border border-[#E8E6DC] text-[#141413]">
                                👑 {t.leadMember.user?.fullName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#8A867D]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-[#141413]">{t.memberCount} members</span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTeam(t);
                              }}
                              className="text-[#C15F3C] font-semibold hover:underline"
                            >
                              Manage
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(t.id, t.name);
                              }}
                              className="text-[#B42318] hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team Members Roster & Details (1 column) */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="text-sm font-bold text-[#141413]">
                {selectedTeam ? `Members: ${selectedTeam.name}` : 'Team Members'}
              </h3>
              {selectedTeam && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="rounded bg-[#C15F3C] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#A84E31]"
                >
                  + Add Member
                </button>
              )}
            </div>

            {!selectedTeam ? (
              <p className="text-xs text-[#625F59] py-8 text-center">
                Select a team from the list to view and manage its assigned members.
              </p>
            ) : selectedTeam.members && selectedTeam.members.length > 0 ? (
              <div className="space-y-2">
                {selectedTeam.members.map((tm) => {
                  const isLead = selectedTeam.leadMemberId === tm.memberId;
                  return (
                    <div
                      key={tm.id}
                      className="p-2.5 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#141413] flex items-center gap-1.5">
                          {tm.member.user?.fullName}
                          {isLead && (
                            <span className="text-[10px] bg-[#996000]/10 text-[#996000] border border-[#996000]/20 px-1 rounded">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#625F59]">{tm.member.user?.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveMemberFromTeam(tm.memberId)}
                        className="text-[11px] text-[#B42318] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#625F59]">
                <p>No members currently assigned to {selectedTeam.name}.</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="mt-2 text-[#C15F3C] font-semibold hover:underline"
                >
                  Add a member now
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Create Team / Department</h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-xs text-[#625F59] hover:text-[#141413]"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Enterprise Sales East"
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Team Code</label>
                <input
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="auto_generated_from_name"
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">
                  Parent Department (Optional)
                </label>
                <select
                  value={parentTeamId}
                  onChange={(e) => setParentTeamId(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                >
                  <option value="">No Parent (Top-level Department)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">
                  Designated Team Lead
                </label>
                <select
                  value={leadMemberId}
                  onChange={(e) => setLeadMemberId(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                >
                  <option value="">No Lead Assigned</option>
                  {orgMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user?.fullName} ({m.user?.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Description</label>
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="Mission, scope or target market for this team..."
                  rows={2}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="rounded-md border border-[#E8E6DC] px-3.5 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#C15F3C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member to Team Modal */}
      {showAddMemberModal && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">
                Add Member to {selectedTeam.name}
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-xs text-[#625F59] hover:text-[#141413]"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleAddMemberToTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">
                  Select Organization Member *
                </label>
                <select
                  required
                  value={selectedMemberToAdd}
                  onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
                >
                  <option value="">-- Choose Member --</option>
                  {orgMembers
                    .filter(
                      (m) =>
                        !selectedTeam.members?.some((tm) => tm.memberId === m.id),
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.fullName} ({m.user?.email}) - {m.role}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="rounded-md border border-[#E8E6DC] px-3.5 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedMemberToAdd}
                  className="rounded-md bg-[#C15F3C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition-colors"
                >
                  Add to Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
