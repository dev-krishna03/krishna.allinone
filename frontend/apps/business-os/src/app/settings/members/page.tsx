'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    isEmailVerified: boolean;
  };
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  token?: string;
  status: string;
  expiresAt: string;
}

export default function MembersSettingsPage() {
  const [members, setMembers] = React.useState<MemberItem[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('EMPLOYEE');
  const [submittingInvite, setSubmittingInvite] = React.useState(false);

  // Transfer ownership state
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [targetUserId, setTargetUserId] = React.useState('');

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
      const orgId = getOrgId();

      // If no org ID in session, fetch user context to resolve first org
      let targetOrgId = orgId;
      if (!targetOrgId) {
        const meRes = await fetch('http://localhost:3001/api/v1/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.organization) {
            targetOrgId = meData.organization.id;
            sessionStorage.setItem('organizationId', targetOrgId);
          }
        }
      }

      if (!targetOrgId) {
        throw new Error('No organization context found. Please select an organization.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-organization-id': targetOrgId,
      };

      const [membersRes, invitesRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/members`, { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/invites`, { headers }),
      ]);

      if (!membersRes.ok) throw new Error('Failed to load members');

      const membersData = await membersRes.json();
      const invitesData = invitesRes.ok ? await invitesRes.json() : [];

      setMembers(membersData);
      setInvitations(invitesData);
    } catch (err: any) {
      setError(err.message || 'Error fetching members');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setError(null);
    const orgId = getOrgId();

    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/invites`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invite failed');

      setMessage(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Update failed');
      }

      setMessage('Member role updated');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    try {
      const orgId = getOrgId();
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Status toggle failed');
      }

      setMessage(`Member status changed to ${newStatus}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Removal failed');
      }

      setMessage('Member removed from workspace');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/invites/${inviteId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error('Revoke failed');

      setMessage('Invitation revoked');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/transfer-ownership`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ newOwnerUserId: targetUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Transfer failed');
      }

      setMessage('Organization ownership successfully transferred');
      setShowTransferModal(false);
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
            <h1 className="font-bold text-sm text-[#141413]">Team Members & Access Governance</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-md bg-[#C15F3C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors"
            >
              + Invite Member
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413]"
            >
              Transfer Ownership
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Organization Members & Seats</h2>
          <p className="text-xs text-[#625F59] mt-1">
            RBAC roles, seat quotas, cryptographic invitations, and member status control.
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

        {/* Members Directory Card */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">Active & Suspended Team Members</h3>
            <span className="text-xs text-[#625F59] bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC]">
              {members.length} Members Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F3EE] border-y border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Joined</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAF9F5]">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#141413]">{m.user?.fullName || 'User'}</div>
                      <div className="text-[11px] text-[#625F59]">{m.user?.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                        className="rounded border border-[#E8E6DC] bg-white px-2 py-1 text-xs font-medium text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="EMPLOYEE">EMPLOYEE</option>
                        <option value="READ_ONLY">READ_ONLY</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-[#476B3C]/10 text-[#476B3C]'
                            : 'bg-[#B42318]/10 text-[#B42318]'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#8A867D]">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(m.id, m.status)}
                        className="text-[11px] font-medium text-[#625F59] hover:text-[#141413]"
                      >
                        {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-[11px] font-medium text-[#B42318] hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations Card */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">Pending Invitations</h3>
            <span className="text-xs text-[#625F59] bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC]">
              {invitations.length} Pending
            </span>
          </div>

          {invitations.length === 0 ? (
            <p className="text-xs text-[#625F59] py-4 text-center">No pending invitations currently.</p>
          ) : (
            <div className="divide-y divide-[#E8E6DC]">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#141413]">{inv.email}</span>
                    <span className="ml-2 rounded bg-[#F4F3EE] px-2 py-0.5 text-[10px] text-[#C15F3C] font-semibold">
                      {inv.role}
                    </span>
                    <div className="text-[11px] text-[#8A867D] mt-0.5">
                      Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      {inv.token && (
                        <span className="ml-2 font-mono text-[10px] text-[#625F59]">
                          (Token: {inv.token.slice(0, 8)}...)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-xs text-[#B42318] hover:underline"
                  >
                    Revoke Invite
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#141413]">Invite Team Member</h3>
            <p className="text-xs text-[#625F59] mt-1">
              Recipient will receive an expiring cryptographic invite with seat enforcement.
            </p>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#141413]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@acme.inc"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413]">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="EMPLOYEE">Employee (Standard access)</option>
                  <option value="MANAGER">Manager (Operational oversight)</option>
                  <option value="ADMIN">Admin (Member management)</option>
                  <option value="READ_ONLY">Read Only (View permissions)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F4F3EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50"
                >
                  {submittingInvite ? 'Dispatching...' : 'Dispatch Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#141413]">Transfer Organization Ownership</h3>
            <p className="text-xs text-[#625F59] mt-1">
              Designate a new Owner. You will transition to an Admin role. The organization will always remain governed.
            </p>

            <form onSubmit={handleTransferOwnership} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#141413]">Select New Owner</label>
                <select
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="">-- Choose an active member --</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.fullName} ({m.user?.email}) - Current: {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F4F3EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetUserId}
                  className="rounded-md bg-[#B42318] px-4 py-2 text-xs font-semibold text-white hover:bg-[#991B1B] disabled:opacity-50"
                >
                  Confirm Ownership Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
