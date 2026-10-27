'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface SecurityAuditEvent {
  id: string;
  organizationId: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export default function SecurityAuditPage() {
  const [events, setEvents] = React.useState<SecurityAuditEvent[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const limit = 25;

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

  const fetchEvents = async (pageIndex = 0) => {
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

      const res = await fetch(
        `http://localhost:3001/api/v1/organizations/${targetOrgId}/security-audit?limit=${limit}&offset=${
          pageIndex * limit
        }`,
        { headers },
      );

      if (!res.ok) throw new Error('Failed to load security audit events');

      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
      setPage(pageIndex);
    } catch (err: any) {
      setError(err.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEvents(0);
  }, []);

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
            <h1 className="font-bold text-sm text-[#141413]">Security & Access Policy Audit Trail</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEvents(page)}
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#625F59] hover:text-[#141413] transition-colors"
            >
              ↻ Refresh Ledger
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Security Audit Trail & Governance Log</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Tamper-evident record of all RBAC role modifications, permission adjustments, team memberships, and simulated access evaluations.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">Security Audit Ledger</h3>
            <span className="text-xs text-[#625F59] bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC]">
              {total} Total Audit Records
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-[#625F59] py-8 text-center">Loading audit records...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#625F59]">
              No security events recorded yet in this workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold">Action / Event</th>
                    <th className="py-2.5 px-3 font-semibold">Target Entity</th>
                    <th className="py-2.5 px-3 font-semibold">Target ID</th>
                    <th className="py-2.5 px-3 font-semibold">Actor</th>
                    <th className="py-2.5 px-3 font-semibold">Metadata & Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 px-3 text-[#625F59] whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F3EE] border border-[#E8E6DC] text-[#141413]">
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#141413] font-medium">
                        {evt.targetType}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[#625F59]">
                        {evt.targetId ? evt.targetId.slice(0, 12) + '...' : '-'}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#141413]">
                        {evt.actorId ? (
                          <span className="font-mono text-[10px]">{evt.actorId.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-[#8A867D]">System</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <pre className="text-[10px] bg-[#FAF9F5] p-1.5 rounded border border-[#E8E6DC] overflow-x-auto max-h-16 text-[#625F59]">
                          {JSON.stringify(evt.metadata || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-3 border-t border-[#E8E6DC] text-xs">
              <span className="text-[#625F59]">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => fetchEvents(page - 1)}
                  className="rounded border border-[#E8E6DC] px-2.5 py-1 text-[#625F59] hover:text-[#141413] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={(page + 1) * limit >= total}
                  onClick={() => fetchEvents(page + 1)}
                  className="rounded border border-[#E8E6DC] px-2.5 py-1 text-[#625F59] hover:text-[#141413] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
