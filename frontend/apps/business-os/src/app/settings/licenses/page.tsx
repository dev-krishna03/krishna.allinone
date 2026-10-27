'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface EntitlementWithSeats {
  id: string;
  status: string;
  assignedSeatsLimit: number;
  product?: {
    id: string;
    slug: string;
    name: string;
    category: string;
  } | null;
  bundle?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  seats: {
    id: string;
    status: string;
    assignedAt: string;
    member: {
      id: string;
      role: string;
      user: {
        id: string;
        fullName: string;
        email: string;
      };
    };
  }[];
  _count?: {
    seats: number;
  };
}

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface UsageMeter {
  id: string;
  metricKey: string;
  currentUsage: number | string;
  softLimit: number | string | null;
  hardLimit: number | string | null;
  resetInterval: string;
  product?: {
    name: string;
    slug: string;
  } | null;
}

export default function LicenseSettingsPage() {
  const [entitlements, setEntitlements] = React.useState<EntitlementWithSeats[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [usageMeters, setUsageMeters] = React.useState<UsageMeter[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [selectedEntitlementId, setSelectedEntitlementId] = React.useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>('');
  const [assigning, setAssigning] = React.useState(false);
  const [revokingSeatId, setRevokingSeatId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('http://localhost:3001/api/v1/me');
      if (!meRes.ok) throw new Error('Could not retrieve organization context');
      const meData = await meRes.json();
      const currentOrgId = meData.organization.id;
      setOrgId(currentOrgId);
      setOrgName(meData.organization.name);

      const [entRes, memRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${currentOrgId}/entitlements`),
        fetch(`http://localhost:3001/api/v1/organizations/${currentOrgId}/members`),
      ]);

      if (entRes.ok) {
        const entData = await entRes.json();
        setEntitlements(entData);
        if (entData.length > 0 && !selectedEntitlementId) {
          setSelectedEntitlementId(entData[0].id);
        }
      }

      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData);
        if (memData.length > 0 && !selectedMemberId) {
          setSelectedMemberId(memData[0].id);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error fetching license data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntitlementId || !selectedMemberId) {
      setMessage({ text: 'Please select both an entitlement and a member', type: 'error' });
      return;
    }

    try {
      setAssigning(true);
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/seats/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entitlementId: selectedEntitlementId,
          memberId: selectedMemberId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Seat assignment failed');
      }

      setMessage({ text: 'Product seat successfully assigned to member!', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error assigning seat', type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeSeat = async (seatId: string) => {
    try {
      setRevokingSeatId(seatId);
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/seats/${seatId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Seat revocation failed');
      }

      setMessage({ text: 'Product seat revoked successfully.', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error revoking seat', type: 'error' });
    } finally {
      setRevokingSeatId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading seat license allocations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/app" className="text-xs text-[#625F59] hover:underline">
                Dashboard
              </Link>
              <span className="text-xs text-[#E8E6DC]">/</span>
              <span className="text-xs font-semibold text-[#141413]">Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-[#141413]">Seat Licensing & Quota Allocations</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Enforce per-product user seat limits with concurrency protection for <span className="font-semibold text-[#141413]">{orgName}</span>
            </p>
          </div>
        </div>

        <SettingsNav />

        {message && (
          <div
            className={`rounded-lg p-3.5 text-xs flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        {/* Seat Quota Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entitlements.map((ent) => {
            const title = ent.bundle?.name || ent.product?.name || 'Full Suite Commercial Package';
            const assigned = ent._count?.seats ?? ent.seats?.length ?? 0;
            const total = ent.assignedSeatsLimit;
            const pct = Math.min(100, Math.round((assigned / (total || 1)) * 100));
            const isFull = assigned >= total;

            return (
              <div key={ent.id} className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#625F59] truncate max-w-[160px]">{title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFull ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isFull ? 'CAP REACHED' : 'SEATS AVAILABLE'}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#141413]">{assigned}</span>
                    <span className="text-xs text-[#625F59]">/ {total} allocated</span>
                  </div>
                  <div className="w-full bg-[#E8E6DC] rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${isFull ? 'bg-amber-500' : 'bg-[#C15F3C]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-[#625F59]">
                  {total - assigned > 0
                    ? `${total - assigned} seats available for team members`
                    : 'Upgrade plan to assign additional member seats'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign Seat Form */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E8E6DC] pb-4">
            <h2 className="text-base font-bold text-[#141413]">Assign Product Seat</h2>
            <p className="text-xs text-[#625F59]">
              Grant a member access to a licensed module. Backend strictly enforces assigned quota without overselling.
            </p>
          </div>

          <form onSubmit={handleAssignSeat} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1">
                Select Licensed Module / Bundle
              </label>
              <select
                value={selectedEntitlementId}
                onChange={(e) => setSelectedEntitlementId(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
              >
                {entitlements.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.bundle?.name || ent.product?.name || 'Full Suite'} ({ent._count?.seats ?? ent.seats?.length ?? 0}/{ent.assignedSeatsLimit} seats)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1">
                Select Team Member
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
              >
                {members.map((mem) => (
                  <option key={mem.id} value={mem.id}>
                    {mem.user.fullName} ({mem.user.email}) - {mem.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={assigning || entitlements.length === 0}
                className="w-full rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition shadow-xs"
              >
                {assigning ? 'Allocating Seat...' : 'Assign Seat to Member'}
              </button>
            </div>
          </form>
        </div>

        {/* Active Member Seat Assignments */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#E8E6DC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Active Seat Assignments</h2>
              <p className="text-xs text-[#625F59]">Members granted access to entitled Business OS applications</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59] font-semibold">
                <tr>
                  <th className="py-3 px-6">Member</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Product / Package</th>
                  <th className="py-3 px-6">Assigned Date</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {entitlements.flatMap((ent) =>
                  (ent.seats || []).map((seat) => (
                    <tr key={seat.id} className="hover:bg-[#FAF9F5]/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-[#141413]">
                        {seat.member.user.fullName}
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">{seat.member.user.email}</td>
                      <td className="py-3.5 px-6">
                        <span className="font-medium text-[#141413]">
                          {ent.bundle?.name || ent.product?.name || 'Full Suite'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">
                        {new Date(seat.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          {seat.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleRevokeSeat(seat.id)}
                          disabled={revokingSeatId === seat.id}
                          className="text-xs font-semibold text-[#B42318] hover:text-[#912018] disabled:opacity-50"
                        >
                          {revokingSeatId === seat.id ? 'Revoking...' : 'Revoke Seat'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {entitlements.every((ent) => !ent.seats || ent.seats.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#625F59]">
                      No member seats assigned yet. Assign a seat above to grant product permissions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
