'use client';

import * as React from 'react';

export default function DeveloperConsolePage() {
  const [diagnostics, setDiagnostics] = React.useState<any>(null);
  const [apiClients, setApiClients] = React.useState<any[]>([]);
  const [health, setHealth] = React.useState<any>(null);
  const [securityDiagnostics, setSecurityDiagnostics] = React.useState<any>(null);
  const [pricingCatalog, setPricingCatalog] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [replaying, setReplaying] = React.useState(false);
  const [replayResult, setReplayResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [diagRes, clientsRes, healthRes, secRes, pricingRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/developer/diagnostics'),
        fetch('http://localhost:3001/api/v1/developer/api-clients'),
        fetch('http://localhost:3001/api/v1/health'),
        fetch('http://localhost:3001/api/v1/developer/security-diagnostics'),
        fetch('http://localhost:3001/api/v1/public/pricing'),
      ]);

      if (!diagRes.ok || !clientsRes.ok || !healthRes.ok) {
        throw new Error('Failed to retrieve developer telemetry from backend');
      }

      const [diagJson, clientsJson, healthJson] = await Promise.all([
        diagRes.json(),
        clientsRes.json(),
        healthRes.json(),
      ]);

      setDiagnostics(diagJson);
      setApiClients(clientsJson);
      setHealth(healthJson);
      if (secRes.ok) {
        setSecurityDiagnostics(await secRes.json());
      }
      if (pricingRes.ok) {
        setPricingCatalog(await pricingRes.json());
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching developer diagnostics');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleReplayOutbox = async () => {
    try {
      setReplaying(true);
      const res = await fetch('http://localhost:3001/api/v1/developer/outbox/process', {
        method: 'POST',
      });
      const data = await res.json();
      setReplayResult(data);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Replay failed');
    } finally {
      setReplaying(false);
    }
  };

  if (loading && !diagnostics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Developer Diagnostics...</p>
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
            <span className="h-8 w-8 rounded bg-[#141413] text-white flex items-center justify-center font-bold text-sm">
              DEV
            </span>
            <div>
              <h1 className="font-bold text-sm text-[#141413]">Developer Console</h1>
              <p className="text-[11px] text-[#625F59]">Diagnostics, Outbox Replay & API Keys</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3002"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Customer Business OS →
            </a>
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              className="rounded-md bg-[#C15F3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31]"
            >
              OpenAPI Swagger Docs ↗
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-4 text-xs text-[#B42318]">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Runtime Diagnostics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Backend Process</span>
            <div className="text-xl font-bold text-[#141413] mt-2 font-mono">
              Node {diagnostics?.runtime?.nodeVersion ?? 'v20+'}
            </div>
            <span className="text-[11px] text-[#625F59]">
              PID: {diagnostics?.runtime?.pid} • Platform: {diagnostics?.runtime?.platform}
            </span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Heap Memory Used</span>
            <div className="text-xl font-bold text-[#141413] mt-2 font-mono">
              {diagnostics?.runtime?.memory ? Math.round(diagnostics.runtime.memory.heapUsed / 1024 / 1024) : 0} MB
            </div>
            <span className="text-[11px] text-[#476B3C] font-semibold">Active Garbage Collection</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Outbox Pending Events</span>
            <div className="text-xl font-bold text-[#C15F3C] mt-2 font-mono">
              {diagnostics?.outboxQueue?.pendingCount ?? 0}
            </div>
            <span className="text-[11px] text-[#625F59]">Durable Postgres Outbox</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs">
            <span className="text-xs font-medium text-[#625F59]">Database Connection</span>
            <div className="text-xl font-bold text-[#476B3C] mt-2">
              {health?.services?.database ? 'Connected' : 'Degraded'}
            </div>
            <span className="text-[11px] text-[#625F59]">
              Redis: {health?.services?.redis ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Transactional Outbox Worker Controls */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Transactional Outbox Queue</h2>
              <p className="text-xs text-[#625F59]">
                Pending domain events (<code className="text-[#C15F3C]">marketing.enquiry.created</code>, etc.)
              </p>
            </div>
            <button
              onClick={handleReplayOutbox}
              disabled={replaying}
              className="rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50"
            >
              {replaying ? 'Processing Outbox...' : 'Trigger Outbox Batch Dispatch'}
            </button>
          </div>

          {replayResult && (
            <div className="rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] p-3 text-xs font-mono">
              Batch replay executed: {JSON.stringify(replayResult)}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F3EE] border-y border-[#E8E6DC] text-[#625F59]">
                <tr>
                  <th className="py-2 px-3">Event Name</th>
                  <th className="py-2 px-3">Aggregate Type</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Retry Count</th>
                  <th className="py-2 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6DC]">
                {diagnostics?.outboxQueue?.recentEvents?.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-[#FAF9F5]">
                    <td className="py-2.5 px-3 font-mono font-medium text-[#141413]">{evt.eventName}</td>
                    <td className="py-2.5 px-3 text-[#625F59]">{evt.aggregateType}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          evt.status === 'PROCESSED'
                            ? 'bg-[#476B3C]/10 text-[#476B3C]'
                            : evt.status === 'FAILED'
                            ? 'bg-[#B42318]/10 text-[#B42318]'
                            : 'bg-[#996000]/10 text-[#996000]'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#625F59]">{evt.retryCount}</td>
                    <td className="py-2.5 px-3 text-[#8A867D]">{new Date(evt.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Security & Policy Diagnostics (Phase 1.3) */}
        {securityDiagnostics && (
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E6DC] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#141413]">
                  Platform Security & Policy Engine Diagnostics
                </h2>
                <p className="text-xs text-[#625F59]">
                  Evaluates RBAC/ABAC engine state, permission catalog registry, and active cache version tracking.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#476B3C]/10 text-[#476B3C] border border-[#476B3C]/20 px-2 py-0.5 rounded font-mono font-semibold">
                  Mode: {securityDiagnostics.policyEngine?.mode}
                </span>
                <span className="text-xs bg-[#F4F3EE] border border-[#E8E6DC] px-2 py-0.5 rounded text-[#141413] font-mono">
                  Hierarchy: {securityDiagnostics.policyEngine?.roleHierarchy}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] p-3 space-y-1">
                <span className="text-xs font-semibold text-[#141413]">Permission Catalog Registry</span>
                <div className="text-xl font-bold text-[#C15F3C] font-mono">
                  {securityDiagnostics.permissionRegistry?.totalRegistered ?? 0} Defined Grants
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(securityDiagnostics.permissionRegistry?.moduleDistribution || {}).map(
                    ([mod, cnt]) => (
                      <span
                        key={mod}
                        className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E8E6DC] text-[#625F59]"
                      >
                        {mod}: {cnt as number}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] p-3 space-y-1">
                <span className="text-xs font-semibold text-[#141413]">Supported Authorization Scopes</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {securityDiagnostics.policyEngine?.recordScopes?.map((s: string) => (
                    <span
                      key={s}
                      className="text-[11px] bg-white px-2 py-0.5 rounded border border-[#E8E6DC] font-mono text-[#141413]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-[#625F59] mt-2">
                  Cache Invalidation Versions: {securityDiagnostics.policyEngine?.activePolicyVersionsTracked ?? 0}
                </div>
              </div>

              <div className="rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] p-3 space-y-1">
                <span className="text-xs font-semibold text-[#141413]">Field-Level Security Rules</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {securityDiagnostics.policyEngine?.fieldSecurity?.map((fs: string) => (
                    <span
                      key={fs}
                      className="text-[11px] bg-white px-2 py-0.5 rounded border border-[#E8E6DC] font-mono text-[#141413]"
                    >
                      {fs}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-[#476B3C] font-semibold mt-2">
                  Masking Patterns: Custom Regex & Suffix (#) Preservation
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commercial Catalog & Entitlements Telemetry */}
        {pricingCatalog && (
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#141413]">Commercial Catalog & Pricing Registry</h2>
                <p className="text-xs text-[#625F59]">Active published SaaS plans, grandfathered rate versions, and regional pricing tiers.</p>
              </div>
              <span className="text-xs bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#E8E6DC] font-semibold text-[#141413]">
                {pricingCatalog.plans?.length || 0} Published Plans
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(pricingCatalog.plans || []).map((p: any) => (
                <div key={p.id} className="p-3.5 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141413]">{p.name}</span>
                    <span className="text-[10px] font-mono bg-white border border-[#E8E6DC] px-1.5 py-0.5 rounded text-[#C15F3C]">
                      {p.edition}
                    </span>
                  </div>
                  <div className="text-[#625F59]">
                    Rate: <span className="font-semibold text-[#141413]">${p.currentVersion?.price ?? 0}</span> / {p.interval}
                  </div>
                  <div className="text-[11px] text-[#8A867D]">
                    {p.includedSeats} included seats • {p.trialDays}d trial
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Clients */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Tenant API Clients & Credentials</h2>
              <p className="text-xs text-[#625F59]">Programmatic REST API keys and assigned access scopes.</p>
            </div>
            <span className="text-xs bg-[#F4F3EE] px-2.5 py-1 rounded border border-[#E8E6DC] font-medium text-[#625F59]">
              {apiClients.length} Registered Keys
            </span>
          </div>

          <div className="space-y-3">
            {apiClients.map((client) => (
              <div
                key={client.id}
                className="p-4 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-sm text-[#141413]">{client.name}</div>
                  <div className="font-mono text-xs text-[#C15F3C] mt-1">{client.clientId}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {client.scopes.map((scope: string) => (
                      <span
                        key={scope}
                        className="rounded bg-white border border-[#E8E6DC] px-1.5 py-0.5 text-[10px] font-mono text-[#625F59]"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#476B3C]/10 text-[#476B3C] font-semibold text-[10px]">
                    {client.status}
                  </span>
                  <div className="text-[10px] text-[#8A867D] mt-1">
                    Issued: {new Date(client.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
