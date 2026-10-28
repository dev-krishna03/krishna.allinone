'use client';

import * as React from 'react';
import Link from 'next/link';
import { createApiClient } from '@business-os/api-client';
import { PlatformEventOutbox } from '@business-os/types';

export default function DurableOutboxEventsPage() {
  const [events, setEvents] = React.useState<PlatformEventOutbox[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [replayingId, setReplayingId] = React.useState<string | null>(null);

  const client = React.useMemo(() => createApiClient(), []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await client.listOutboxEvents({
        status: statusFilter || undefined,
        limit: 50,
      });
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load outbox events');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

  const handleReplay = async (id: string) => {
    try {
      setReplayingId(id);
      await client.replayOutboxEvent(id);
      await fetchEvents();
    } catch (err: any) {
      alert(`Replay failed: ${err.message}`);
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 lg:p-10 font-sans text-[#141413]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DC] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold text-sm">
                EVT
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">Transactional Outbox Events Stream</h1>
            </div>
            <p className="text-xs text-[#625F59] mt-1">
              Guaranteed at-least-once domain event outbox. Replay failed events and inspect distributed event payloads.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-[#E8E6DC] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              ← Developer Overview
            </Link>
            <Link
              href="/developer/queues"
              className="rounded-lg bg-[#141413] px-3.5 py-2 text-xs font-semibold text-white hover:bg-black"
            >
              Queues Telemetry →
            </Link>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-xl border border-[#B42318]/30 bg-[#B42318]/5 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#625F59]">Filter Status:</span>
            {['', 'PENDING', 'PROCESSED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#141413] text-white'
                    : 'bg-white border border-[#E8E6DC] text-[#625F59] hover:bg-[#F4F3EE]'
                }`}
              >
                {st || 'ALL'}
              </button>
            ))}
          </div>
          <span className="text-xs text-[#8A867D] font-mono">{events.length} Events Listed</span>
        </div>

        {/* Outbox Table */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white shadow-xs overflow-hidden">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] bg-[#FAF9F5]">
              No outbox events match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E6DC] bg-[#FAF9F5] text-[#625F59]">
                    <th className="py-2.5 px-4 font-medium">Event Name</th>
                    <th className="py-2.5 px-4 font-medium">Aggregate</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Retries</th>
                    <th className="py-2.5 px-4 font-medium">Created At</th>
                    <th className="py-2.5 px-4 font-medium">Payload Data</th>
                    <th className="py-2.5 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 px-4 font-mono font-bold text-[#141413]">{evt.eventName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#625F59]">
                        {evt.aggregateType} ({evt.aggregateId?.slice(0, 8)}...)
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            evt.status === 'PROCESSED'
                              ? 'bg-[#476B3C]/10 text-[#476B3C]'
                              : evt.status === 'FAILED'
                              ? 'bg-[#B42318]/10 text-[#B42318]'
                              : 'bg-[#C15F3C]/10 text-[#C15F3C]'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-center">{evt.retryCount}</td>
                      <td className="py-3 px-4 text-[#8A867D] text-[11px]">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#625F59] max-w-xs truncate">
                        {JSON.stringify(evt.payload)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleReplay(evt.id)}
                          disabled={replayingId === evt.id}
                          className="px-2.5 py-1 rounded border border-[#E8E6DC] bg-white text-[11px] font-semibold hover:bg-[#F4F3EE] disabled:opacity-50"
                        >
                          {replayingId === evt.id ? 'Replaying...' : 'Replay'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
