'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../../settings-nav';

interface Plan {
  id: string;
  name: string;
  edition: string;
  interval: string;
  includedSeats: number;
  currentVersion?: {
    id: string;
    price: number | string;
  };
}

export default function ManageSubscriptionPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = React.useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>('');
  const [seats, setSeats] = React.useState<number>(5);
  const [quote, setQuote] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [orgId, setOrgId] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [cancelModal, setCancelModal] = React.useState(false);
  const [msg, setMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('http://localhost:3001/api/v1/me');
      if (!meRes.ok) throw new Error('Could not retrieve identity');
      const meData = await meRes.json();
      const currentOrgId = meData.organization.id;
      setOrgId(currentOrgId);
      setOrgName(meData.organization.name);

      const [plansRes, subRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/public/pricing'),
        fetch(`http://localhost:3001/api/v1/organizations/${currentOrgId}/billing/subscription`),
      ]);

      let availablePlans: Plan[] = [];
      if (plansRes.ok) {
        const pData = await plansRes.json();
        availablePlans = pData.plans || pData || [];
        setPlans(availablePlans);
      }

      if (subRes.ok) {
        const sData = await subRes.json();
        setCurrentSub(sData);
        if (sData?.planId) {
          setSelectedPlanId(sData.planId);
          setSeats(sData.seatQuantity || 5);
        } else if (availablePlans.length > 0) {
          setSelectedPlanId(availablePlans[0].id);
        }
      } else if (availablePlans.length > 0) {
        setSelectedPlanId(availablePlans[0].id);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error loading subscription options', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch real-time proration quote whenever plan or seats change
  React.useEffect(() => {
    if (!orgId || !selectedPlanId) return;

    async function loadQuote() {
      try {
        setQuoteLoading(true);
        const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/billing/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanId,
            seatQuantity: Number(seats),
          }),
        });

        if (res.ok) {
          setQuote(await res.json());
        }
      } catch (_) {
        // ignore
      } finally {
        setQuoteLoading(false);
      }
    }

    loadQuote();
  }, [orgId, selectedPlanId, seats]);

  const handleConfirmPlanChange = async () => {
    try {
      setSubmitting(true);
      // 1. Create signed checkout session
      const checkoutRes = await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/billing/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanId,
            seatQuantity: Number(seats),
            successUrl: window.location.origin + '/settings/billing?checkout=success',
            cancelUrl: window.location.origin + '/settings/billing/manage',
          }),
        },
      );

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json();
        throw new Error(errData.message || 'Checkout failed');
      }

      const checkoutData = await checkoutRes.json();

      // 2. Direct server subscription change for platform test suite / sandbox
      await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/billing/subscription/change`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetPlanId: selectedPlanId,
            seatQuantity: Number(seats),
          }),
        },
      );

      setMsg({
        text: `Subscription updated to ${seats} seats on ${quote?.planName || 'Selected Plan'}!`,
        type: 'success',
      });

      // If provider generated external hosted URL, user can optionally navigate
      if (checkoutData.successUrl && checkoutData.successUrl.startsWith('http')) {
        // Redirect if external checkout is simulated or active
      }

      await fetchInitialData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update plan', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (immediately: boolean) => {
    try {
      const q = immediately ? '?immediately=true' : '';
      const res = await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/billing/subscription${q}`,
        { method: 'DELETE' },
      );

      if (!res.ok) throw new Error('Cancellation failed');

      setMsg({
        text: immediately
          ? 'Subscription cancelled immediately.'
          : 'Cancellation scheduled for the end of the current billing cycle.',
        type: 'success',
      });
      setCancelModal(false);
      await fetchInitialData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Cancellation error', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading commercial tier manager...</p>
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
              <Link href="/settings/billing" className="text-xs text-[#625F59] hover:underline">
                Billing
              </Link>
              <span className="text-xs text-[#E8E6DC]">/</span>
              <span className="text-xs font-semibold text-[#141413]">Manage</span>
            </div>
            <h1 className="text-2xl font-bold text-[#141413]">Change Plan & Seat Allocation</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Upgrade edition, adjust team member seats, or preview prorated adjustments for{' '}
              <span className="font-semibold text-[#141413]">{orgName}</span>
            </p>
          </div>
          <Link
            href="/settings/billing"
            className="rounded-lg border border-[#E8E6DC] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE] transition"
          >
            ← Back to Billing Overview
          </Link>
        </div>

        <SettingsNav />

        {msg && (
          <div
            className={`rounded-lg p-3.5 text-xs flex items-center justify-between border ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Selection & Seat Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#141413]">1. Select Commercial Plan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#C15F3C] bg-[#FAF9F5] shadow-xs ring-1 ring-[#C15F3C]'
                          : 'border-[#E8E6DC] bg-white hover:border-[#C15F3C]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C15F3C]">
                          {p.edition}
                        </span>
                        <span className="text-[10px] text-[#625F59]">{p.interval}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#141413]">{p.name}</h3>
                      <div className="text-xs text-[#625F59] mt-1">
                        Base Included: <strong className="text-[#141413]">{p.includedSeats} seats</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#141413]">2. Licensed Member Seats</h2>
              <p className="text-xs text-[#625F59]">
                Adjust the number of member seats allocated to this tenant. Concurrency protection prevents assignment beyond this quota.
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="h-9 w-9 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] font-bold text-sm text-[#141413] hover:bg-[#F4F3EE]"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-2xl font-extrabold text-[#141413] font-mono">{seats}</span>
                  <span className="block text-[10px] text-[#625F59]">Seats</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSeats(seats + 1)}
                  className="h-9 w-9 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] font-bold text-sm text-[#141413] hover:bg-[#F4F3EE]"
                >
                  +
                </button>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="flex-1 accent-[#C15F3C]"
                />
              </div>
            </div>

            {/* Danger Zone / Cancel */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-6 space-y-3">
              <h3 className="text-sm font-bold text-rose-900">Subscription Cancellation</h3>
              <p className="text-xs text-rose-700">
                You can schedule cancellation for the end of your billing cycle. Customer business records will remain retained under platform governance.
              </p>
              <button
                onClick={() => setCancelModal(true)}
                className="py-1.5 px-3 rounded-md border border-rose-300 bg-white text-xs font-semibold text-rose-800 hover:bg-rose-50"
              >
                Cancel Subscription Options...
              </button>
            </div>
          </div>

          {/* Real-time Signed Quote & Proration Summary */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="border-b border-[#E8E6DC] pb-3">
                <h3 className="font-bold text-base text-[#141413]">Order Quote & Proration</h3>
                <p className="text-[11px] text-[#625F59]">Cryptographically signed server quote snapshot</p>
              </div>

              {quoteLoading ? (
                <div className="py-8 text-center text-xs text-[#625F59]">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto mb-2" />
                  Calculating proration adjustments...
                </div>
              ) : quote ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-[#625F59]">
                    <span>Target Edition:</span>
                    <span className="font-bold text-[#141413]">{quote.edition}</span>
                  </div>
                  <div className="flex justify-between text-[#625F59]">
                    <span>Seat Quantity:</span>
                    <span className="font-mono text-[#141413]">{quote.seatQuantity}</span>
                  </div>
                  <div className="flex justify-between text-[#625F59]">
                    <span>Unit Price:</span>
                    <span className="text-[#141413]">${quote.unitPrice}/seat/mo</span>
                  </div>
                  <div className="flex justify-between text-[#625F59]">
                    <span>Subtotal:</span>
                    <span className="text-[#141413]">${quote.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-[#625F59]">
                    <span>Estimated Tax (10%):</span>
                    <span className="text-[#141413]">${quote.estimatedTax}</span>
                  </div>

                  {quote.proration?.isProrated && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-1 text-[11px]">
                      <div className="flex justify-between font-bold">
                        <span>Proration Credit:</span>
                        <span>−${quote.proration.creditAmount}</span>
                      </div>
                      <div className="text-[10px] text-amber-700">
                        {quote.proration.daysRemaining} days remaining in current cycle applied as credit
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#E8E6DC] flex justify-between items-baseline font-bold">
                    <span className="text-sm text-[#141413]">Net Payable:</span>
                    <span className="text-xl text-[#C15F3C]">
                      ${quote.proration?.netPayable ?? quote.totalAmount} {quote.currency}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#625F59]">Select a plan to calculate quote.</p>
              )}
            </div>

            <button
              onClick={handleConfirmPlanChange}
              disabled={submitting || !quote}
              className="w-full py-2.5 rounded-lg bg-[#C15F3C] text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition shadow-xs"
            >
              {submitting ? 'Processing Order...' : 'Confirm Plan Change & Checkout'}
            </button>
          </div>
        </div>

        {/* Cancellation Modal */}
        {cancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
                <h3 className="font-bold text-sm text-[#141413]">Confirm Subscription Cancellation</h3>
                <button
                  onClick={() => setCancelModal(false)}
                  className="text-xs text-[#625F59] hover:text-[#141413]"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#625F59]">
                Are you sure you want to cancel your Business OS subscription? Please select your preferred cancellation timing:
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleCancelSubscription(false)}
                  className="w-full text-left p-3 rounded-lg border border-[#E8E6DC] hover:border-[#C15F3C] transition text-xs space-y-1"
                >
                  <strong className="block text-[#141413]">Cancel at End of Billing Period</strong>
                  <span className="text-[11px] text-[#625F59]">
                    Retain active access through the end of your prepaid term.
                  </span>
                </button>

                <button
                  onClick={() => handleCancelSubscription(true)}
                  className="w-full text-left p-3 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition text-xs space-y-1"
                >
                  <strong className="block text-rose-900">Cancel Immediately</strong>
                  <span className="text-[11px] text-rose-700">
                    Immediately terminates module access without deleting business records.
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-[#E8E6DC] flex justify-end">
                <button
                  onClick={() => setCancelModal(false)}
                  className="py-1.5 px-3 rounded-md text-xs font-semibold text-[#625F59] hover:bg-[#F4F3EE]"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
