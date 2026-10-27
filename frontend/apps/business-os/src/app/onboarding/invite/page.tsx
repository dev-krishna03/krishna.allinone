'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function OnboardingInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') || '';
  const orgName = searchParams.get('orgName') || 'Workspace';

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('EMPLOYEE');
  const [invites, setInvites] = React.useState<{ email: string; role: string; token: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError('Missing organization ID');
      return;
    }

    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;

    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invitation failed');
      }

      setInvites([...invites, { email: data.email, role: data.role, token: data.token }]);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error sending invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10 space-y-6">
      <form className="space-y-4" onSubmit={handleSendInvite}>
        {error && (
          <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#141413]">Teammate Email</label>
            <input
              type="email"
              required
              placeholder="colleague@acme.inc"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413]">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="READ_ONLY">Read Only</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] py-2 px-4 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE] disabled:opacity-50"
        >
          {loading ? 'Sending Invite...' : '+ Send Team Invitation'}
        </button>
      </form>

      {/* Dispatched Invites List */}
      {invites.length > 0 && (
        <div className="border-t border-[#E8E6DC] pt-4 space-y-2">
          <h4 className="text-xs font-semibold text-[#141413]">Dispatched Invitations:</h4>
          {invites.map((inv, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#FAF9F5] border border-[#E8E6DC] text-xs">
              <span className="font-medium text-[#141413]">{inv.email}</span>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#F4F3EE] px-2 py-0.5 text-[10px] font-semibold text-[#C15F3C]">{inv.role}</span>
                <span className="text-[10px] text-[#476B3C]">Pending</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#E8E6DC] pt-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/app')}
          className="text-xs text-[#625F59] hover:text-[#141413]"
        >
          Skip for now
        </button>

        <button
          onClick={() => router.push('/app')}
          className="rounded-md bg-[#C15F3C] py-2.5 px-6 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors"
        >
          Finish & Enter Dashboard →
        </button>
      </div>
    </div>
  );
}

export default function OnboardingInvitePage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DC] bg-[#F4F3EE] px-3 py-1 text-xs font-semibold text-[#C15F3C]">
          <span>Step 2 of 2: Team Collaboration</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#141413]">Invite your Core Team</h2>
        <p className="text-xs text-[#625F59]">
          Grant initial access scopes. Recipients receive cryptographic invitations with seat availability enforcement.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <React.Suspense fallback={<div className="p-8 text-center text-xs text-[#625F59]">Loading onboarding...</div>}>
          <OnboardingInviteContent />
        </React.Suspense>
      </div>
    </div>
  );
}
