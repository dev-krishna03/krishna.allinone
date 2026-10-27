'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';

export default function SuperAdminBillingPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/v1/admin/billing/overview');
      if (!res.ok) throw new Error('Failed to retrieve billing telemetry');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Error fetching billing overview');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Platform Revenue & Subscriptions Telemetry...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pastDueSubscriptions: 0,
  };

  const payments = data?.recentPayments || [];

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
              <p className="text-[11px] text-[#625F59]">Platform Revenue & Subscription Governance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3002"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Customer Business OS →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <SuperAdminNav />

        {error && (
          <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-4 text-xs text-[#B42318]">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Revenue KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Monthly Recurring Revenue</span>
            <div className="text-2xl font-bold text-[#141413] mt-2 font-mono">
              ${metrics.mrr.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#476B3C] font-semibold">Active Run-Rate</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Annualized Run Rate (ARR)</span>
            <div className="text-2xl font-bold text-[#141413] mt-2 font-mono">
              ${metrics.arr.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#625F59]">12x MRR projection</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Active Subscriptions</span>
            <div className="text-2xl font-bold text-[#C15F3C] mt-2 font-mono">
              {metrics.activeSubscriptions} / {metrics.totalSubscriptions}
            </div>
            <span className="text-[11px] text-[#625F59]">Commercial tenant workspaces</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Past Due / Dunning</span>
            <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
              {metrics.pastDueSubscriptions}
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">In 7-day grace period</span>
          </div>
        </div>

        {/* Recent Transactions & Payments */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#E8E6DC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Recent Platform Settlements</h2>
              <p className="text-xs text-[#625F59]">
                Privacy-safe aggregate transaction logs across payment providers
              </p>
            </div>
            <a
              href="/super-admin/payments"
              className="text-xs font-semibold text-[#C15F3C] hover:underline"
            >
              Full Payment Ledger & Webhooks →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-3 px-6">Payment ID</th>
                  <th className="py-3 px-6">Tenant Organization</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {payments.length > 0 ? (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[#141413]">
                        {p.providerPaymentId || p.id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-[#141413]">
                        {p.organization?.name || 'Workspace'}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-[#141413]">
                        ${p.amount} {p.currency}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            p.status === 'SUCCEEDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#625F59]">
                      No platform payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
