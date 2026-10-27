'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';

interface Plan {
  id: string;
  name: string;
  edition: string;
  publishStatus: string;
  interval: string;
  trialDays: number;
  includedSeats: number;
  productId?: string | null;
  bundleId?: string | null;
  product?: { name: string; slug: string } | null;
  bundle?: { name: string; slug: string } | null;
  versions?: {
    id: string;
    version: number;
    price: number | string;
    currency: string;
    effectiveFrom: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  // New plan form state
  const [newPlanName, setNewPlanName] = React.useState('');
  const [newPlanEdition, setNewPlanEdition] = React.useState('GROWTH');
  const [newPlanInterval, setNewPlanInterval] = React.useState('MONTHLY');
  const [newPlanSeats, setNewPlanSeats] = React.useState(5);
  const [newPlanTrialDays, setNewPlanTrialDays] = React.useState(14);
  const [newPlanPrice, setNewPlanPrice] = React.useState(29);
  const [newPlanProductId, setNewPlanProductId] = React.useState('');
  const [submittingPlan, setSubmittingPlan] = React.useState(false);
  const [publishingId, setPublishingId] = React.useState<string | null>(null);

  const fetchPlansAndProducts = async () => {
    try {
      setLoading(true);
      const [plansRes, prodsRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/platform/plans'),
        fetch('http://localhost:3001/api/v1/platform/products'),
      ]);

      if (!plansRes.ok) throw new Error('Failed to retrieve plans');
      const plansData = await plansRes.json();
      setPlans(plansData);

      if (prodsRes.ok) {
        const prodsData = await prodsRes.json();
        setProducts(prodsData);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading plan catalog');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPlansAndProducts();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPlan(true);
      const res = await fetch('http://localhost:3001/api/v1/platform/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlanName,
          edition: newPlanEdition,
          interval: newPlanInterval,
          includedSeats: Number(newPlanSeats),
          trialDays: Number(newPlanTrialDays),
          productId: newPlanProductId || undefined,
          price: Number(newPlanPrice),
          currency: 'USD',
          featureLimits: { maxWorkspaces: 1, advancedExport: true },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to create plan');
      }

      setMsg(`Plan "${newPlanName}" created successfully!`);
      setNewPlanName('');
      await fetchPlansAndProducts();
    } catch (err: any) {
      setError(err.message || 'Error creating plan');
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handlePublishPlan = async (planId: string) => {
    try {
      setPublishingId(planId);
      const res = await fetch(`http://localhost:3001/api/v1/platform/plans/${planId}/publish`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to publish plan');
      }

      setMsg('Plan published live! Transactional Outbox event "catalog.plan.published" emitted.');
      await fetchPlansAndProducts();
    } catch (err: any) {
      setError(err.message || 'Error publishing plan');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Commercial Plans & Editions...</p>
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
              <p className="text-[11px] text-[#625F59]">Commercial Plan Modeling & Publishing</p>
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

        {msg && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="font-bold">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#141413]">Commercial Plans & Editions</h2>
            <p className="text-xs text-[#625F59]">
              Define SaaS plans, seat quotas, automated trial days, and publish updates with outbox domain events
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans Table */}
          <div className="lg:col-span-2 rounded-xl border border-[#E8E6DC] bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E8E6DC] bg-[#FAF9F5] flex justify-between items-center">
              <span className="text-xs font-bold text-[#141413]">Commercial Plan Catalog</span>
              <span className="text-xs text-[#625F59]">{plans.length} configured plans</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                  <tr>
                    <th className="p-4">Plan Name</th>
                    <th className="p-4">Edition</th>
                    <th className="p-4">Rate & Interval</th>
                    <th className="p-4">Seats / Trial</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {plans.map((p) => {
                    const latestVersion = p.versions && p.versions.length > 0 ? p.versions[0] : null;
                    const price = latestVersion ? `$${latestVersion.price}` : '$0';
                    const isPublished = p.publishStatus === 'PUBLISHED';
                    const isPublishing = publishingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-[#FAF9F5]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#141413]">{p.name}</div>
                          <div className="text-[11px] text-[#A09D95]">
                            {p.bundle?.name || p.product?.name || 'Full Platform'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#FAF9F5] border border-[#E8E6DC] font-semibold text-[10px] px-2 py-0.5 rounded text-[#141413]">
                            {p.edition}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-[#141413]">{price}</span>
                          <span className="text-[#625F59] text-[11px]"> / {p.interval.toLowerCase()}</span>
                        </td>
                        <td className="p-4 text-[#625F59]">
                          <div>{p.includedSeats} seats</div>
                          <div className="text-[11px] text-[#A09D95]">{p.trialDays}d trial</div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isPublished
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.publishStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {!isPublished && (
                            <button
                              onClick={() => handlePublishPlan(p.id)}
                              disabled={isPublishing}
                              className="px-2.5 py-1 bg-[#C15F3C] text-white rounded text-[11px] font-semibold hover:bg-[#A84E31] disabled:opacity-50 transition"
                            >
                              {isPublishing ? 'Publishing...' : 'Publish'}
                            </button>
                          )}
                          {isPublished && (
                            <span className="text-[11px] font-semibold text-emerald-700">✓ Live</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Plan Form */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-base text-[#141413]">Create New Plan</h3>
              <p className="text-xs text-[#625F59]">Configure edition, pricing version, and quotas</p>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g., Starter Business Plan"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  required
                  className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Edition Tier</label>
                <select
                  value={newPlanEdition}
                  onChange={(e) => setNewPlanEdition(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="COMMUNITY">COMMUNITY (Free / Open)</option>
                  <option value="STARTER">STARTER</option>
                  <option value="GROWTH">GROWTH</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Interval</label>
                  <select
                    value={newPlanInterval}
                    onChange={(e) => setNewPlanInterval(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Rate ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Included Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlanSeats}
                    onChange={(e) => setNewPlanSeats(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Trial Days</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlanTrialDays}
                    onChange={(e) => setNewPlanTrialDays(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Target Product (Optional)</label>
                <select
                  value={newPlanProductId}
                  onChange={(e) => setNewPlanProductId(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="">All-in-One Full Platform / Bundle</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingPlan}
                className="w-full py-2 bg-[#C15F3C] text-white rounded-md text-xs font-semibold hover:bg-[#A84E31] disabled:opacity-50 transition"
              >
                {submittingPlan ? 'Creating Plan...' : 'Create Commercial Plan'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
