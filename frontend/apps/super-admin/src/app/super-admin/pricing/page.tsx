'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';

interface PlanWithVersions {
  id: string;
  name: string;
  edition: string;
  interval: string;
  currentVersionId?: string | null;
  product?: { name: string; slug: string } | null;
  bundle?: { name: string; slug: string } | null;
  versions: {
    id: string;
    version: number;
    price: string | number;
    currency: string;
    featureLimits: Record<string, any>;
    effectiveFrom: string;
    effectiveTo: string | null;
  }[];
}

export default function SuperAdminPricingPage() {
  const [plans, setPlans] = React.useState<PlanWithVersions[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/v1/platform/plans');
      if (!res.ok) throw new Error('Failed to retrieve pricing versions');
      const data = await res.json();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Error loading price books');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPricing();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Pricing Books & Version Snapshots...</p>
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
              <p className="text-[11px] text-[#625F59]">Price Books & Grandfathered Versioning</p>
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

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#141413]">Price Versioning & Grandfathered Rate History</h2>
            <p className="text-xs text-[#625F59]">
              Every price change creates an immutable version snapshot. Existing customer subscriptions remain pinned to their contracted version.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#141413]">{p.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E8E6DC] text-[#625F59]">
                      {p.edition}
                    </span>
                  </div>
                  <p className="text-xs text-[#625F59] mt-0.5">
                    {p.bundle?.name || p.product?.name || 'Full Business OS Platform'} • Billing: {p.interval}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[#625F59]">Versions Published:</span>{' '}
                  <span className="font-bold text-xs text-[#141413]">{p.versions?.length || 0}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                    <tr>
                      <th className="py-2.5 px-4">Version</th>
                      <th className="py-2.5 px-4">Rate</th>
                      <th className="py-2.5 px-4">Currency</th>
                      <th className="py-2.5 px-4">Effective Range</th>
                      <th className="py-2.5 px-4">Feature Limits Payload</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DC]">
                    {(p.versions || []).map((ver) => {
                      const isCurrent = p.currentVersionId === ver.id;
                      return (
                        <tr key={ver.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#141413]">
                            v{ver.version}.0
                          </td>
                          <td className="py-3 px-4 font-bold text-[#141413]">
                            ${ver.price}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#625F59]">{ver.currency}</td>
                          <td className="py-3 px-4 text-[#625F59]">
                            {new Date(ver.effectiveFrom).toLocaleDateString()} —{' '}
                            {ver.effectiveTo ? new Date(ver.effectiveTo).toLocaleDateString() : 'Present'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#625F59] max-w-xs truncate">
                            {JSON.stringify(ver.featureLimits)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isCurrent ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                Current Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-[#FAF9F5] border border-[#E8E6DC] text-[#625F59] px-2 py-0.5 text-[10px] font-medium">
                                Grandfathered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
