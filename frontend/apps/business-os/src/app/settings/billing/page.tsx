'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface SubscriptionData {
  id: string;
  status: string;
  seatQuantity: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  customer?: {
    billingEmail: string;
    billingName?: string;
    paymentMethodBrand?: string;
    paymentMethodLast4?: string;
    paymentMethodExpiry?: string;
  } | null;
  plan?: {
    name: string;
    edition: string;
    billingInterval: string;
  } | null;
  planVersion?: {
    version: number;
    priceAmount: string | number;
    currency: string;
  } | null;
  invoices?: {
    id: string;
    invoiceNumber: string;
    totalAmount: string | number;
    currency: string;
    status: string;
    dueDate: string;
    paidAt?: string | null;
  }[];
}

export default function BillingOverviewPage() {
  const [sub, setSub] = React.useState<SubscriptionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [updatingCard, setUpdatingCard] = React.useState(false);
  const [cardBrand, setCardBrand] = React.useState('VISA');
  const [cardLast4, setCardLast4] = React.useState('4242');
  const [cardExpiry, setCardExpiry] = React.useState('12/28');
  const [msg, setMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('http://localhost:3001/api/v1/me');
      if (!meRes.ok) throw new Error('Could not retrieve identity');
      const meData = await meRes.json();
      const currentOrgId = meData.organization.id;
      setOrgId(currentOrgId);
      setOrgName(meData.organization.name);

      const subRes = await fetch(
        `http://localhost:3001/api/v1/organizations/${currentOrgId}/billing/subscription`,
      );
      if (subRes.ok) {
        setSub(await subRes.json());
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error loading billing profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchBilling();
  }, []);

  const handleUpdatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [expiryMonth, expiryYear] = cardExpiry.split('/');
      const res = await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/billing/payment-method`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodToken: `pm_tok_${Date.now()}`,
            brand: cardBrand,
            last4: cardLast4,
            expiryMonth: expiryMonth || '12',
            expiryYear: expiryYear || '28',
          }),
        },
      );

      if (!res.ok) throw new Error('Failed to update payment method');

      setMsg({ text: 'Payment method updated successfully!', type: 'success' });
      setUpdatingCard(false);
      await fetchBilling();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error updating card', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading SaaS billing & subscription records...</p>
        </div>
      </div>
    );
  }

  const isPastDue = sub?.status === 'PAST_DUE';
  const isCancelled = sub?.status === 'CANCELLED';
  const price = sub?.planVersion ? `$${sub.planVersion.priceAmount}` : '$0';
  const seats = sub?.seatQuantity ?? 5;
  const brand = sub?.customer?.paymentMethodBrand || 'VISA';
  const last4 = sub?.customer?.paymentMethodLast4 || '4242';
  const expiry = sub?.customer?.paymentMethodExpiry || '12/28';

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/app" className="text-xs text-[#625F59] hover:underline">
                Dashboard
              </Link>
              <span className="text-xs text-[#E8E6DC]">/</span>
              <span className="text-xs font-semibold text-[#141413]">Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-[#141413]">SaaS Billing & Subscriptions</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Platform recurring subscriptions, payments, and invoices for{' '}
              <span className="font-semibold text-[#141413]">{orgName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/billing/manage"
              className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#A84E31] transition"
            >
              Change Plan / Seats →
            </Link>
            <Link
              href="/settings/billing/invoices"
              className="rounded-lg border border-[#E8E6DC] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE] transition"
            >
              Invoices & Receipts
            </Link>
          </div>
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
            <button onClick={() => setMsg(null)} className="font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Dunning / Past Due Alert */}
        {isPastDue && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Action Required: Past Due Payment
              </span>
              <p className="text-xs text-rose-700">
                A recent renewal payment failed. We have entered a 7-day grace period. Please update your payment method to avoid suspension of automated workflows.
              </p>
            </div>
            <button
              onClick={() => setUpdatingCard(true)}
              className="rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition shadow-xs whitespace-nowrap"
            >
              Update Payment Method
            </button>
          </div>
        )}

        {/* Scheduled Cancellation Alert */}
        {sub?.cancelAtPeriodEnd && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 flex items-center justify-between">
            <span>
              <strong>Scheduled Cancellation:</strong> Your subscription will terminate at the end of the billing period on{' '}
              {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
            </span>
            <Link
              href="/settings/billing/manage"
              className="font-bold underline ml-4 hover:text-amber-900"
            >
              Reactivate Subscription
            </Link>
          </div>
        )}

        {/* Subscription Plan & Payment Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Subscription Card */}
          <div className="md:col-span-2 rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C15F3C] bg-[#C15F3C]/10 px-2 py-0.5 rounded-full">
                  {sub?.plan?.edition || 'GROWTH'} EDITION
                </span>
                <h2 className="text-lg font-bold text-[#141413] mt-1.5">
                  {sub?.plan?.name || 'Unified Business OS Platform'}
                </h2>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                  isPastDue
                    ? 'bg-rose-100 text-rose-800'
                    : isCancelled
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {sub?.status || 'ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#625F59]">Monthly Rate</span>
                <div className="font-bold text-base text-[#141413] mt-0.5">{price}</div>
                <span className="text-[11px] text-[#A09D95]">/seat/month</span>
              </div>
              <div>
                <span className="text-[#625F59]">Licensed Seats</span>
                <div className="font-bold text-base text-[#141413] mt-0.5">{seats} Seats</div>
                <span className="text-[11px] text-[#A09D95]">Concurrency locked</span>
              </div>
              <div>
                <span className="text-[#625F59]">Current Term</span>
                <div className="font-medium text-xs text-[#141413] mt-1">
                  {sub ? new Date(sub.currentPeriodStart).toLocaleDateString() : 'N/A'}
                </div>
                <span className="text-[11px] text-[#A09D95]">
                  to {sub ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[#625F59]">Auto-Renew Policy</span>
                <div className="font-semibold text-xs text-[#141413] mt-1">
                  {sub?.cancelAtPeriodEnd ? 'Cancels at term end' : 'Auto-renews monthly'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E6DC] flex items-center justify-between text-xs">
              <span className="text-[#625F59]">
                Estimated Next Charge:{' '}
                <strong className="text-[#141413]">
                  ${(Number(sub?.planVersion?.priceAmount || 49) * seats).toFixed(2)}
                </strong>
              </span>
              <Link
                href="/settings/billing/manage"
                className="text-xs font-semibold text-[#C15F3C] hover:underline"
              >
                Adjust seat quota or upgrade tier →
              </Link>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
                <h3 className="font-bold text-sm text-[#141413]">Payment Method</h3>
                <span className="text-[10px] uppercase font-bold text-[#476B3C] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>

              <div className="mt-4 p-4 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#141413]">{brand}</span>
                  <span className="text-[10px] text-[#625F59]">•••• {last4}</span>
                </div>
                <div className="text-[11px] text-[#625F59]">Expires {expiry}</div>
              </div>

              <div className="mt-3 text-[11px] text-[#625F59]">
                Billing Contact: <span className="text-[#141413] font-medium">{sub?.customer?.billingEmail}</span>
              </div>
            </div>

            <button
              onClick={() => setUpdatingCard(true)}
              className="w-full py-2 rounded-lg border border-[#E8E6DC] bg-white text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE] transition"
            >
              Update Payment Card
            </button>
          </div>
        </div>

        {/* Update Payment Modal */}
        {updatingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
                <h3 className="font-bold text-sm text-[#141413]">Update Payment Method</h3>
                <button
                  onClick={() => setUpdatingCard(false)}
                  className="text-xs text-[#625F59] hover:text-[#141413]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdatePaymentMethod} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Card Brand</label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                  >
                    <option value="VISA">VISA</option>
                    <option value="MASTERCARD">MASTERCARD</option>
                    <option value="AMEX">AMERICAN EXPRESS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      className="w-full p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E6DC] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdatingCard(false)}
                    className="w-1/2 py-2 rounded-lg border border-[#E8E6DC] text-xs font-semibold text-[#625F59] hover:bg-[#F4F3EE]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded-lg bg-[#C15F3C] text-xs font-semibold text-white hover:bg-[#A84E31] shadow-xs"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Recent Invoices Preview */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#E8E6DC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Recent Platform SaaS Invoices</h2>
              <p className="text-xs text-[#625F59]">
                Trustworthy billing receipts issued for Business OS platform subscription terms
              </p>
            </div>
            <Link
              href="/settings/billing/invoices"
              className="text-xs font-semibold text-[#C15F3C] hover:underline"
            >
              View All Invoices →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-3 px-6">Invoice Number</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {sub?.invoices && sub.invoices.length > 0 ? (
                  sub.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[#141413]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-[#141413]">
                        ${inv.totalAmount} {inv.currency}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          href="/settings/billing/invoices"
                          className="text-xs font-semibold text-[#C15F3C] hover:underline"
                        >
                          Download Receipt ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#625F59]">
                      No platform SaaS invoices generated yet.
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
