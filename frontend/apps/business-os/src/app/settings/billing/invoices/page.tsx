'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../../settings-nav';

interface Invoice {
  id: string;
  invoiceNumber: string;
  providerInvoiceId?: string | null;
  status: string;
  billingReason: string;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string | null;
  pdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  lineItems: any[];
  payments?: {
    id: string;
    amount: number | string;
    currency: string;
    status: string;
    paidAt?: string | null;
  }[];
}

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('http://localhost:3001/api/v1/me');
      if (!meRes.ok) throw new Error('Could not retrieve identity');
      const meData = await meRes.json();
      const currentOrgId = meData.organization.id;
      setOrgId(currentOrgId);
      setOrgName(meData.organization.name);

      const invRes = await fetch(
        `http://localhost:3001/api/v1/organizations/${currentOrgId}/billing/invoices`,
      );
      if (invRes.ok) {
        setInvoices(await invRes.json());
      }
    } catch (_) {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading platform billing documents...</p>
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
              <span className="text-xs font-semibold text-[#141413]">Invoices</span>
            </div>
            <h1 className="text-2xl font-bold text-[#141413]">Platform SaaS Invoices & Receipts</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Official commercial receipts issued by Unified Business OS for <span className="font-semibold text-[#141413]">{orgName}</span>
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

        {/* Informational Banner on Separation from Tenant Finance */}
        <div className="rounded-xl border border-[#2F5C83]/30 bg-[#2F5C83]/5 p-4 text-xs text-[#2F5C83] flex items-center justify-between">
          <div className="space-y-0.5">
            <strong>Platform Billing Isolation:</strong> These documents represent your organization&apos;s subscription fees paid to the SaaS platform. They are completely separate from customer sales invoices generated in your tenant&apos;s Core Financial Ledger.
          </div>
          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#2F5C83]/30">
            ISOLATED_LEDGER
          </span>
        </div>

        {/* Invoices Table */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#E8E6DC] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#141413]">Billing History ({invoices.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Billing Period</th>
                  <th className="py-3 px-6">Due / Paid Date</th>
                  <th className="py-3 px-6">Subtotal</th>
                  <th className="py-3 px-6">Tax</th>
                  <th className="py-3 px-6">Total Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Receipt / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[#141413]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">
                        {new Date(inv.periodStart).toLocaleDateString()} — {new Date(inv.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 text-[#625F59]">${inv.subtotalAmount}</td>
                      <td className="py-3.5 px-6 text-[#625F59]">${inv.taxAmount}</td>
                      <td className="py-3.5 px-6 font-bold text-[#141413]">
                        ${inv.totalAmount} {inv.currency}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'OPEN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-xs font-semibold text-[#C15F3C] hover:underline"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#625F59]">
                      No billing invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A09D95]">Platform Receipt</span>
                  <h3 className="font-bold text-base text-[#141413]">{selectedInvoice.invoiceNumber}</h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs text-[#625F59] hover:text-[#141413]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-[#625F59]">
                  <span>Status:</span>
                  <span className="font-bold text-[#141413]">{selectedInvoice.status}</span>
                </div>
                <div className="flex justify-between text-[#625F59]">
                  <span>Billing Reason:</span>
                  <span className="font-mono text-[#141413]">{selectedInvoice.billingReason}</span>
                </div>
                <div className="flex justify-between text-[#625F59]">
                  <span>Period:</span>
                  <span className="text-[#141413]">
                    {new Date(selectedInvoice.periodStart).toLocaleDateString()} — {new Date(selectedInvoice.periodEnd).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E8E6DC]">
                  <h4 className="font-semibold text-[#141413] mb-2">Line Items</h4>
                  <div className="space-y-1.5 bg-[#FAF9F5] p-3 rounded-lg border border-[#E8E6DC]">
                    {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? (
                      selectedInvoice.lineItems.map((li, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{li.description || 'SaaS Subscription'}</span>
                          <span className="font-bold">${li.amount || selectedInvoice.totalAmount}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-[11px]">
                        <span>Platform SaaS Commercial Tier</span>
                        <span className="font-bold">${selectedInvoice.totalAmount}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-[#E8E6DC]">
                  <div className="flex justify-between text-[#625F59]">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotalAmount}</span>
                  </div>
                  <div className="flex justify-between text-[#625F59]">
                    <span>Tax (10%):</span>
                    <span>${selectedInvoice.taxAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-[#141413]">
                    <span>Total Paid:</span>
                    <span>${selectedInvoice.totalAmount} {selectedInvoice.currency}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E6DC] flex justify-end">
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="py-2 px-4 rounded-lg bg-[#C15F3C] text-xs font-semibold text-white hover:bg-[#A84E31]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
