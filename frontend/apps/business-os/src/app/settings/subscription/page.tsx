'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface Entitlement {
  id: string;
  status: string;
  assignedSeatsLimit: number;
  trialEndsAt: string | null;
  currentPeriodStartsAt: string;
  currentPeriodEndsAt: string | null;
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
  planVersion?: {
    version: number;
    price: string | number;
    currency: string;
    interval: string;
    featureLimits: Record<string, any>;
    plan: {
      name: string;
      edition: string;
    };
  } | null;
  _count?: {
    seats: number;
  };
}

interface PublicPlan {
  id: string;
  name: string;
  edition: string;
  interval: string;
  trialDays: number;
  includedSeats: number;
  currentVersion: {
    id: string;
    version: number;
    price: number | string;
    currency: string;
    featureLimits: Record<string, any>;
  };
  product?: {
    slug: string;
    name: string;
  } | null;
  bundle?: {
    slug: string;
    name: string;
  } | null;
}

export default function SubscriptionSettingsPage() {
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>([]);
  const [publicPlans, setPublicPlans] = React.useState<PublicPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [subscribingPlanId, setSubscribingPlanId] = React.useState<string | null>(null);
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

      const [entRes, plansRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${currentOrgId}/entitlements`),
        fetch('http://localhost:3001/api/v1/public/pricing'),
      ]);

      if (entRes.ok) {
        setEntitlements(await entRes.json());
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPublicPlans(plansData.plans || []);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error fetching subscription data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (plan: PublicPlan) => {
    try {
      setSubscribingPlanId(plan.id);
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/entitlements/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          productId: plan.product?.slug ? undefined : undefined,
          assignedSeatsLimit: plan.includedSeats || 5,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Subscription failed');
      }

      setMessage({ text: `Successfully subscribed to ${plan.name} (${plan.edition})!`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update subscription', type: 'error' });
    } finally {
      setSubscribingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading commercial subscription profile...</p>
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
            <h1 className="text-2xl font-bold text-[#141413]">Subscription & Commercial Entitlements</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Manage plans, active module licenses, billing cycles, and feature thresholds for <span className="font-semibold text-[#141413]">{orgName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/marketplace"
              className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#A84E31] transition"
            >
              Explore App Marketplace →
            </Link>
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

        {/* Current Active Entitlements */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Active Subscriptions</h2>
              <p className="text-xs text-[#625F59]">Entitled products and commercial packages for your workspace</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#FAF9F5] border border-[#E8E6DC] px-2.5 py-0.5 text-xs font-semibold text-[#141413]">
              {entitlements.length} Active {entitlements.length === 1 ? 'Plan' : 'Plans'}
            </span>
          </div>

          {entitlements.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#E8E6DC] rounded-lg">
              <p className="text-xs text-[#625F59]">No active product entitlements found for this workspace.</p>
              <p className="text-[11px] text-[#A09D95] mt-1">Select a plan below to activate module features.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {entitlements.map((ent) => {
                const title = ent.bundle?.name || ent.product?.name || 'Full Suite Commercial Package';
                const edition = ent.planVersion?.plan.edition || 'GROWTH';
                const price = ent.planVersion?.price ? `$${ent.planVersion.price}/mo` : 'Included';
                const seatsUsed = ent._count?.seats ?? 0;
                const seatsTotal = ent.assignedSeatsLimit;
                const isTrial = ent.status === 'TRIAL';

                return (
                  <div key={ent.id} className="rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          isTrial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {ent.status}
                        </span>
                        <span className="text-xs font-semibold text-[#625F59]">{edition}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#141413]">{title}</h3>
                      <p className="text-xs text-[#625F59] mt-0.5">Rate: <span className="font-semibold text-[#141413]">{price}</span></p>

                      <div className="mt-4 pt-3 border-t border-[#E8E6DC] space-y-1 text-xs">
                        <div className="flex justify-between text-[#625F59]">
                          <span>Seats Allocated:</span>
                          <span className="font-medium text-[#141413]">{seatsUsed} / {seatsTotal}</span>
                        </div>
                        <div className="w-full bg-[#E8E6DC] rounded-full h-1.5">
                          <div
                            className="bg-[#C15F3C] h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((seatsUsed / (seatsTotal || 1)) * 100))}%` }}
                          />
                        </div>
                        {ent.trialEndsAt && (
                          <div className="text-[11px] text-amber-700 pt-1">
                            Trial ends: {new Date(ent.trialEndsAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 flex gap-2">
                      <Link
                        href="/settings/licenses"
                        className="w-full text-center py-1.5 rounded-md text-xs font-semibold border border-[#E8E6DC] bg-white text-[#141413] hover:bg-[#F4F3EE] transition"
                      >
                        Manage Seats
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Plans Catalog */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E8E6DC] pb-4">
            <h2 className="text-base font-bold text-[#141413]">Commercial Plans & Upgrade Options</h2>
            <p className="text-xs text-[#625F59]">
              Published plans with versioned grandfathered pricing, automated trials, and seat allocations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {publicPlans.map((plan) => {
              const price = plan.currentVersion ? `$${plan.currentVersion.price}` : '$0';
              const isSubscribing = subscribingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="rounded-lg border border-[#E8E6DC] bg-white p-5 flex flex-col justify-between hover:border-[#C15F3C]/50 transition-colors shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C15F3C] bg-[#C15F3C]/10 px-2 py-0.5 rounded-full">
                        {plan.edition}
                      </span>
                      <span className="text-xs text-[#625F59]">{plan.interval}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#141413]">{plan.name}</h3>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-[#141413]">{price}</span>
                        <span className="text-xs text-[#625F59]">/month</span>
                      </div>
                    </div>

                    <div className="border-t border-[#E8E6DC] pt-3 space-y-2 text-xs text-[#625F59]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C15F3C] font-bold">✓</span>
                        <span>{plan.includedSeats} Member Seats included</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C15F3C] font-bold">✓</span>
                        <span>{plan.trialDays}-day automated trial</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C15F3C] font-bold">✓</span>
                        <span>Version {plan.currentVersion?.version || 1} locked pricing</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E8E6DC]">
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={isSubscribing}
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-[#C15F3C] text-white hover:bg-[#A84E31] disabled:opacity-50 transition shadow-xs"
                    >
                      {isSubscribing ? 'Processing...' : 'Subscribe / Upgrade'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
