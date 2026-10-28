'use client';

import * as React from 'react';
import Link from 'next/link';
import { createApiClient } from '@business-os/api-client';
import { QueueTelemetry } from '@business-os/types';

export default function QueuesTelemetryPage() {
  const [queues, setQueues] = React.useState<QueueTelemetry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const client = React.useMemo(() => createApiClient(), []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const data = await client.getQueueTelemetry();
      setQueues(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch queue telemetry');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchQueues();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 lg:p-10 font-sans text-[#141413]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DC] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-[#141413] text-white flex items-center justify-center font-bold text-sm">
                Q
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">Redis & BullMQ Queues Telemetry</h1>
            </div>
            <p className="text-xs text-[#625F59] mt-1">
              Live job queues status, active workers, failure rates, and background processing throughput.
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
              href="/developer/events"
              className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A84E31]"
            >
              Durable Outbox Stream →
            </Link>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-xl border border-[#B42318]/30 bg-[#B42318]/5 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Queues Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {queues.map((q) => (
            <div key={q.name} className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#C15F3C]">{q.name}</span>
                <span className="h-2 w-2 rounded-full bg-[#476B3C]" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#E8E6DC]">
                <div>
                  <div className="text-sm font-bold text-[#141413] font-mono">{q.counts.waiting}</div>
                  <div className="text-[10px] text-[#625F59]">Waiting</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#476B3C] font-mono">{q.counts.completed}</div>
                  <div className="text-[10px] text-[#625F59]">Completed</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#B42318] font-mono">{q.counts.failed}</div>
                  <div className="text-[10px] text-[#625F59]">Failed</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Jobs Telemetry */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Recent Queue Jobs & Execution Traces</h2>
              <p className="text-xs text-[#625F59]">
                Payload traces, attempt numbers, and execution exceptions from background workers.
              </p>
            </div>
            <button
              onClick={fetchQueues}
              className="px-3 py-1 rounded-md border border-[#E8E6DC] bg-[#FAF9F5] text-xs font-semibold hover:bg-[#F4F3EE]"
            >
              Refresh Queues
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                  <th className="pb-2 font-medium">Job ID</th>
                  <th className="pb-2 font-medium">Queue Name / Event</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Attempts</th>
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Payload Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {queues
                  .flatMap((q) => q.recentJobs.map((j) => ({ ...j, queueName: q.name })))
                  .map((job) => (
                    <tr key={job.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 font-mono text-[11px] text-[#625F59]">{job.id.slice(0, 12)}...</td>
                      <td className="py-3">
                        <div className="font-semibold text-[#141413]">{job.name}</div>
                        <div className="text-[10px] font-mono text-[#8A867D]">{job.queueName}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.status === 'completed'
                              ? 'bg-[#476B3C]/10 text-[#476B3C]'
                              : job.status === 'failed'
                              ? 'bg-[#B42318]/10 text-[#B42318]'
                              : 'bg-[#C15F3C]/10 text-[#C15F3C]'
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{job.attemptsMade}</td>
                      <td className="py-3 text-[#8A867D] text-[11px]">
                        {new Date(job.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-[#625F59] max-w-xs truncate">
                        {JSON.stringify(job.data)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
