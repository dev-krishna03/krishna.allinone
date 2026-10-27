'use client';

import * as React from 'react';

export default function SuperAdminPage() {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        const [overviewRes, tenantsRes, auditRes] = await Promise.all([
          fetch('http://localhost:3001/api/v1/admin/overview'),
          fetch('http://localhost:3001/api/v1/admin/tenants'),
          fetch('http://localhost:3001/api/v1/admin/audit-logs?limit=15'),
        ]);

        if (!overviewRes.ok || !tenantsRes.ok || !auditRes.ok) {
          throw new Error('Failed to retrieve operational metrics from backend');
        }

        const [overviewJson, tenantsJson, auditJson] = await Promise.all([
          overviewRes.json(),
          tenantsRes.json(),
          auditRes.json(),
        ]);

        setMetrics(overviewJson);
        setTenants(tenantsJson);
        setAuditLogs(auditJson);
      } catch (err: any) {
        setError(err.message || 'Error loading Super Admin telemetry');
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Super Admin Operational Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Header */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded bg-[#B42318] text-white flex items-center justify-center font-bold text-sm">
              SA
            </span>
            <div>
              <h1 className="font-bold text-sm text-[#141413]">SaaS Super Admin</h1>
              <p className="text-[11px] text-[#625F59]">Privacy-Safe Operational Governance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3002"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Customer Business OS →
            </a>
            <a
              href="http://localhost:3004"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Developer Console →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-4 text-xs text-[#B42318]">
            <strong>Telemetry Error:</strong> {error}
          </div>
        )}

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Total Organizations</span>
            <div className="text-3xl font-extrabold text-[#141413] mt-2">
              {metrics?.overview?.totalOrganizations ?? 0}
            </div>
            <span className="text-[11px] text-[#476B3C] font-semibold">Tenant-isolated instances</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Active Member Seats</span>
            <div className="text-3xl font-extrabold text-[#141413] mt-2">
              {metrics?.overview?.activeUsers ?? 0}
            </div>
            <span className="text-[11px] text-[#625F59]">Across all tenant boundaries</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Marketing Enquiries</span>
            <div className="text-3xl font-extrabold text-[#141413] mt-2">
              {metrics?.overview?.totalEnquiries ?? 0}
            </div>
            <span className="text-[11px] text-[#2F5C83] font-semibold">Captured via public web</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Outbox Processed</span>
            <div className="text-3xl font-extrabold text-[#476B3C] mt-2">
              {metrics?.telemetry?.outbox?.processed ?? 0}
            </div>
            <span className="text-[11px] text-[#625F59]">
              Pending: {metrics?.telemetry?.outbox?.pending ?? 0}
            </span>
          </div>
        </div>

        {/* Tenant Directory */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Registered Tenant Organizations</h2>
              <p className="text-xs text-[#625F59]">Privacy-safe aggregate view without customer private records.</p>
            </div>
            <span className="text-xs bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC] font-medium text-[#625F59]">
              {tenants.length} Tenants Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F3EE] border-y border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Tenant Name</th>
                  <th className="py-2.5 px-4 font-semibold">Slug</th>
                  <th className="py-2.5 px-4 font-semibold">Plan Tier</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Seats / API Keys</th>
                  <th className="py-2.5 px-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FAF9F5]">
                    <td className="py-3 px-4 font-semibold text-[#141413]">{t.name}</td>
                    <td className="py-3 px-4 font-mono text-[#625F59]">{t.slug}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-[#F4F3EE] px-2 py-0.5 font-medium text-[#C15F3C] border border-[#E8E6DC]">
                        {t.planTier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-[#476B3C]/10 text-[#476B3C] px-2 py-0.5 font-semibold">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#625F59]">
                      {t._count?.users ?? 0} seats • {t._count?.apiClients ?? 0} keys
                    </td>
                    <td className="py-3 px-4 text-[#8A867D]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Audit Ledger */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Global Audit Trail</h2>
              <p className="text-xs text-[#625F59]">Immutable security and domain action records.</p>
            </div>
            <span className="text-xs bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC] font-medium text-[#625F59]">
              Total Logged: {metrics?.telemetry?.auditLogsTotal ?? 0}
            </span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#C15F3C]" />
                  <div>
                    <span className="font-semibold text-[#141413]">{log.action}</span>
                    <span className="text-[#625F59] ml-2">
                      ({log.entityType} ID: {log.entityId?.slice(0, 8)}...)
                    </span>
                  </div>
                </div>
                <div className="text-[#8A867D] font-mono text-[11px]">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
