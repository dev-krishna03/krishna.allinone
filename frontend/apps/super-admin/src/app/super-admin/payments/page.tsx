'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = React.useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, whRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/admin/billing/payments'),
        fetch('http://localhost:3001/api/v1/admin/billing/webhook-events'),
      ]);

      if (payRes.ok) setPayments(await payRes.json());
      if (whRes.ok) setWebhookEvents(await whRes.json());
    } catch (err: any) {
      setError(err.message || 'Error loading payments and webhook logs');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleRetryWebhook = async (eventId: string) => {
    try {
      setRetryingId(eventId);
      const res = await fetch(
        `http://localhost:3001/api/v1/admin/billing/webhook-events/${eventId}/retry`,
        { method: 'POST' },
      );

      if (!res.ok) throw new Error('Retry execution failed');

      setMsg(`Webhook event ${eventId} successfully reprocessed!`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error retrying webhook event');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Payments Ledger & Webhook Logs...</p>
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
              <p className="text-[11px] text-[#625F59]">Platform Payments & Provider Webhook Intake</p>
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
          <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-4 text-xs text-[#B42318] flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold">✕</button>
          </div>
        )}

        {msg && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="font-bold">✕</button>
          </div>
        )}

        {/* Payments Ledger */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E8E6DC] bg-[#FAF9F5] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Platform Payment Transactions</h2>
              <p className="text-xs text-[#625F59]">
                Live settlements processed against SaaS subscription terms
              </p>
            </div>
            <span className="text-xs bg-white px-2.5 py-1 rounded border border-[#E8E6DC] font-semibold text-[#141413]">
              {payments.length} Payments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-3 px-6">Payment ID</th>
                  <th className="py-3 px-6">Tenant Organization</th>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Method</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Settled Date</th>
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
                      <td className="py-3.5 px-6 font-mono text-[#625F59]">
                        {p.invoice?.invoiceNumber || 'N/A'}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-[#141413]">
                        ${p.amount} {p.currency}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[#625F59]">
                        {p.paymentMethodType}
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
                    <td colSpan={7} className="py-8 text-center text-[#625F59]">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Events Log */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E8E6DC] bg-[#FAF9F5] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Payment Provider Webhook Ingestion Log</h2>
              <p className="text-xs text-[#625F59]">
                Raw event intake store, HMAC signature verification status, and dead-letter retry diagnostics
              </p>
            </div>
            <span className="text-xs bg-white px-2.5 py-1 rounded border border-[#E8E6DC] font-semibold text-[#141413]">
              {webhookEvents.length} Events Received
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-3 px-6">Event ID</th>
                  <th className="py-3 px-6">Provider</th>
                  <th className="py-3 px-6">Event Type</th>
                  <th className="py-3 px-6">Signature</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Received At</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {webhookEvents.length > 0 ? (
                  webhookEvents.map((ev: any) => {
                    const isFailed = ev.status === 'FAILED';
                    const isRetrying = retryingId === ev.eventId;

                    return (
                      <tr key={ev.id} className="hover:bg-[#FAF9F5]/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-[#141413]">
                          {ev.eventId}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-[#141413]">
                          <span className="bg-[#FAF9F5] border border-[#E8E6DC] px-2 py-0.5 rounded text-[10px] font-mono">
                            {ev.provider}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[#625F59]">
                          {ev.eventType}
                        </td>
                        <td className="py-3.5 px-6">
                          {ev.signatureVerified ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-700 font-semibold text-[11px]">
                              ✕ Unverified
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              ev.status === 'PROCESSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-[#625F59]">
                          {new Date(ev.receivedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-2">
                          <button
                            onClick={() => setSelectedEvent(ev)}
                            className="text-xs font-semibold text-[#625F59] hover:text-[#141413] underline"
                          >
                            Payload
                          </button>
                          {isFailed && (
                            <button
                              onClick={() => handleRetryWebhook(ev.eventId)}
                              disabled={isRetrying}
                              className="px-2.5 py-1 rounded bg-[#C15F3C] text-white text-[11px] font-semibold hover:bg-[#A84E31] disabled:opacity-50"
                            >
                              {isRetrying ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#625F59]">
                      No webhook events logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Payload Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A09D95]">Webhook Raw Event</span>
                  <h3 className="font-bold text-base text-[#141413]">
                    {selectedEvent.provider} • {selectedEvent.eventType}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs text-[#625F59] hover:text-[#141413]"
                >
                  ✕
                </button>
              </div>

              {selectedEvent.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                  <strong>Processing Error:</strong> {selectedEvent.errorMessage}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#625F59]">Raw JSON Payload:</span>
                <pre className="max-h-80 overflow-y-auto p-3.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg text-[11px] font-mono text-[#141413]">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              <div className="pt-3 border-t border-[#E8E6DC] flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="py-2 px-4 rounded-lg bg-[#141413] text-xs font-semibold text-white hover:bg-black"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
