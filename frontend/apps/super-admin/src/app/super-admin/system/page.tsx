'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';
import { createApiClient } from '@business-os/api-client';
import { PlatformIncident, SystemHealthReport } from '@business-os/types';

export default function SystemHealthAndIncidentsPage() {
  const [health, setHealth] = React.useState<SystemHealthReport | null>(null);
  const [incidents, setIncidents] = React.useState<PlatformIncident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // New Incident Modal state
  const [showModal, setShowModal] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [severity, setSeverity] = React.useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [services, setServices] = React.useState('core-api, webhooks');
  const [submitting, setSubmitting] = React.useState(false);

  const client = React.useMemo(() => createApiClient(), []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [h, incs] = await Promise.all([
        client.getSystemHealth(),
        client.listIncidents(),
      ]);
      setHealth(h);
      setIncidents(incs);
    } catch (err: any) {
      setError(err.message || 'Failed to load system health and incidents');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleDeclareIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await client.createIncident({
        title,
        description,
        severity,
        affectedServices: services.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      await fetchData();
    } catch (err: any) {
      alert(`Error declaring incident: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIncident = async (id: string) => {
    const msg = prompt('Enter resolution message for timeline:');
    if (!msg) return;

    try {
      await client.updateIncident(id, {
        status: 'RESOLVED',
        timelineMessage: msg,
      });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to resolve incident: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 lg:p-10 font-sans text-[#141413]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DC] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold text-sm">
                SYS
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">System Health & Incidents</h1>
            </div>
            <p className="text-xs text-[#625F59] mt-1">
              Real-time platform service diagnostics, database pool telemetry, and governed incident response.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-[#B42318] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#991B1B] transition-colors"
          >
            + Declare Platform Incident
          </button>
        </header>

        <SuperAdminNav />

        {error && (
          <div className="p-4 rounded-xl border border-[#B42318]/30 bg-[#B42318]/5 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Health Diagnostics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Overall Status</span>
            <div className="text-xl font-bold mt-2 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health?.status === 'healthy' ? 'bg-[#476B3C]' : 'bg-[#B42318]'
                }`}
              />
              <span className="capitalize">{health?.status || 'Loading...'}</span>
            </div>
            <span className="text-[11px] text-[#625F59]">Uptime: {health?.uptimeSeconds || 0}s</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">PostgreSQL Database</span>
            <div className="text-xl font-bold text-[#476B3C] mt-2 font-mono">
              {health?.services?.database?.status === 'up' ? 'Online' : 'Degraded'}
            </div>
            <span className="text-[11px] text-[#625F59]">
              Latency: {health?.services?.database?.latencyMs ?? 0} ms
            </span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Outbox Queue</span>
            <div className="text-xl font-bold text-[#141413] mt-2 font-mono">
              {health?.services?.outbox?.pendingEvents ?? 0} Pending
            </div>
            <span className="text-[11px] text-[#8A867D]">
              Failed: {health?.services?.outbox?.failedEvents ?? 0}
            </span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Heap Memory</span>
            <div className="text-xl font-bold text-[#141413] mt-2 font-mono">
              {health?.metrics?.heapUsedMB ?? 0} MB
            </div>
            <span className="text-[11px] text-[#625F59]">Total Allocated: {health?.metrics?.heapTotalMB ?? 0} MB</span>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Platform Incidents & Outage Log</h2>
              <p className="text-xs text-[#625F59]">
                Governed incident tracker with severity levels, service impact, and auditable resolution timelines.
              </p>
            </div>
            <span className="text-xs bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#E8E6DC] font-mono font-semibold text-[#141413]">
              {incidents.length} Registered
            </span>
          </div>

          {incidents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] bg-[#FAF9F5] rounded-lg border border-dashed border-[#E8E6DC]">
              No system incidents recorded. All platform microservices are operating normally.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                    <th className="pb-2 font-medium">Incident #</th>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Severity</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Affected Services</th>
                    <th className="pb-2 font-medium">Declared</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 font-mono font-semibold text-[#141413]">{inc.incidentNumber}</td>
                      <td className="py-3">
                        <div className="font-semibold text-[#141413]">{inc.title}</div>
                        <div className="text-[11px] text-[#625F59] truncate max-w-xs">{inc.description}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-[#B42318]/10 text-[#B42318]'
                              : inc.severity === 'HIGH'
                              ? 'bg-[#C15F3C]/10 text-[#C15F3C]'
                              : 'bg-[#996000]/10 text-[#996000]'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inc.status === 'RESOLVED'
                              ? 'bg-[#476B3C]/10 text-[#476B3C]'
                              : 'bg-[#B42318]/10 text-[#B42318]'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {inc.affectedServices.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E6DC] text-[10px] font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-[#8A867D] text-[11px]">
                        {new Date(inc.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        {inc.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolveIncident(inc.id)}
                            className="px-2.5 py-1 rounded bg-[#476B3C] text-white font-semibold text-[11px] hover:bg-[#3D5B33]"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Declare Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Declare Platform Incident</h3>
              <button onClick={() => setShowModal(false)} className="text-[#625F59] hover:text-[#141413]">✕</button>
            </div>

            <form onSubmit={handleDeclareIncident} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#141413] mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outbound Webhook Worker Degraded Latency"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs focus:outline-none focus:border-[#C15F3C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e: any) => setSeverity(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
                >
                  <option value="LOW">LOW — Minor annoyance, no customer impact</option>
                  <option value="MEDIUM">MEDIUM — Performance degraded, workarounds available</option>
                  <option value="HIGH">HIGH — Key capability failing for multiple tenants</option>
                  <option value="CRITICAL">CRITICAL — Total service outage or data integrity risk</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Affected Microservices (comma-separated)</label>
                <input
                  type="text"
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Technical Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Observed symptoms, error codes, and preliminary mitigation steps..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs focus:outline-none focus:border-[#C15F3C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] text-xs font-semibold text-[#625F59]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#B42318] text-white text-xs font-semibold hover:bg-[#991B1B] disabled:opacity-50"
                >
                  {submitting ? 'Declaring...' : 'Declare Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
