'use client';

import * as React from 'react';
import { SettingsNav } from '../settings-nav';
import { createApiClient } from '@business-os/api-client';
import { ConnectorInstallation, ConnectorProvider, WebhookSubscription } from '@business-os/types';

export default function IntegrationsSettingsPage() {
  const [providers, setProviders] = React.useState<ConnectorProvider[]>([]);
  const [installations, setInstallations] = React.useState<ConnectorInstallation[]>([]);
  const [webhooks, setWebhooks] = React.useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connectingSlug, setConnectingSlug] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // New webhook state
  const [showWebhookModal, setShowWebhookModal] = React.useState(false);
  const [targetUrl, setTargetUrl] = React.useState('');
  const [eventsInput, setEventsInput] = React.useState('user.*, invoice.*');

  const client = React.useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('current_org_id') || '00000000-0000-0000-0000-000000000000' : '00000000-0000-0000-0000-000000000000';
    return createApiClient({
      getAuthToken: () => token,
      organizationId: orgId,
    });
  }, []);

  const orgId = typeof window !== 'undefined' ? localStorage.getItem('current_org_id') || '00000000-0000-0000-0000-000000000000' : '00000000-0000-0000-0000-000000000000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provList, instList, whList] = await Promise.all([
        client.listConnectorProviders().catch(() => []),
        client.listOrgIntegrations(orgId).catch(() => []),
        client.listWebhookSubscriptions(orgId).catch(() => []),
      ]);
      setProviders(provList);
      setInstallations(instList);
      setWebhooks(whList);
    } catch (err: any) {
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [orgId]);

  const handleConnect = async (slug: string) => {
    try {
      setConnectingSlug(slug);
      const res = await client.initiateOAuthConnect(orgId, slug);
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      alert(`OAuth initiation failed: ${err.message}`);
    } finally {
      setConnectingSlug(null);
    }
  };

  const handleDisconnect = async (providerIdOrSlug: string) => {
    if (!confirm('Are you sure you want to disconnect and revoke this integration?')) return;
    try {
      await client.disconnectIntegration(orgId, providerIdOrSlug);
      await fetchData();
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.createWebhookSubscription(orgId, {
        targetUrl,
        subscribedEvents: eventsInput.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowWebhookModal(false);
      setTargetUrl('');
      await fetchData();
    } catch (err: any) {
      alert(`Failed to register webhook: ${err.message}`);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await client.testWebhookSubscription(orgId, id);
      alert(`Test ping completed with status ${res.statusCode} (${res.durationMs}ms)`);
    } catch (err: any) {
      alert(`Test ping failed: ${err.message}`);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return;
    try {
      await client.deleteWebhookSubscription(orgId, id);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete webhook: ${err.message}`);
    }
  };

  const connectedSlugs = new Set(
    installations.filter((i) => i.status === 'CONNECTED').map((i) => i.provider?.slug),
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 lg:p-10 font-sans text-[#141413]">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-[#E8E6DC] pb-5">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold text-sm">
              INT
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">Integrations & OAuth Vault</h1>
              <p className="text-xs text-[#625F59] mt-0.5">
                Connect external productivity, collaboration, and CRM platforms with encrypted credential isolation.
              </p>
            </div>
          </div>
        </header>

        <SettingsNav />

        {error && (
          <div className="p-4 rounded-xl border border-[#B42318]/30 bg-[#B42318]/5 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Installed Integrations */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Connected Services</h2>
              <p className="text-xs text-[#625F59]">
                Active OAuth connectors authorized to synchronize organization data.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#E8E6DC]">
              {installations.filter((i) => i.status === 'CONNECTED').length} Active Connectors
            </span>
          </div>

          {installations.filter((i) => i.status === 'CONNECTED').length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] bg-[#FAF9F5] rounded-lg border border-dashed border-[#E8E6DC]">
              No active connectors linked yet. Select an available provider below to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {installations
                .filter((i) => i.status === 'CONNECTED')
                .map((inst) => (
                  <div
                    key={inst.id}
                    className="p-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={inst.provider?.iconUrl || ''}
                        alt=""
                        className="h-9 w-9 rounded-lg border border-[#E8E6DC] bg-white p-1.5"
                      />
                      <div>
                        <div className="font-bold text-sm text-[#141413]">{inst.provider?.name}</div>
                        <div className="text-[11px] text-[#625F59]">
                          Account: <span className="font-mono text-[#141413]">{inst.externalAccountEmail || 'Connected'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {inst.scopesGranted.map((sc) => (
                            <span key={sc} className="px-1.5 py-0.5 rounded bg-white border border-[#E8E6DC] text-[10px] font-mono">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#8A867D]">
                        Synced: {inst.lastSyncAt ? new Date(inst.lastSyncAt).toLocaleTimeString() : 'Pending'}
                      </span>
                      <button
                        onClick={() => handleDisconnect(inst.provider?.slug || inst.providerId)}
                        className="px-3 py-1.5 rounded-lg border border-[#B42318]/30 bg-white text-xs font-semibold text-[#B42318] hover:bg-[#B42318]/5 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Available Providers Grid */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#141413]">Available Platform Connectors</h2>
            <p className="text-xs text-[#625F59]">
              Standard vetted enterprise connectors supported natively with PKCE security and secret vault storage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => {
              const isConnected = connectedSlugs.has(p.slug);
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <img src={p.iconUrl || ''} alt="" className="h-8 w-8 rounded-lg bg-white p-1 border border-[#E8E6DC]" />
                      <span className="text-[10px] font-mono uppercase bg-white border border-[#E8E6DC] px-2 py-0.5 rounded text-[#625F59]">
                        {p.category}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#141413]">{p.name}</div>
                    <p className="text-xs text-[#625F59] line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-2 border-t border-[#E8E6DC] flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#476B3C]">
                      {isConnected ? '✓ Connected' : 'Ready to link'}
                    </span>
                    <button
                      disabled={isConnected || connectingSlug === p.slug}
                      onClick={() => handleConnect(p.slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isConnected
                          ? 'bg-[#E8E6DC] text-[#8A867D] cursor-not-allowed'
                          : 'bg-[#C15F3C] text-white hover:bg-[#A84E31]'
                      }`}
                    >
                      {connectingSlug === p.slug ? 'Linking...' : isConnected ? 'Installed' : 'Connect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outbound Webhooks Governance Card */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Outbound Webhooks Subscriptions</h2>
              <p className="text-xs text-[#625F59]">
                Register secure HTTP webhook callbacks with HMAC SHA-256 signatures for transactional platform events.
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#141413] text-white text-xs font-semibold hover:bg-black"
            >
              + Add Webhook Endpoint
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] bg-[#FAF9F5] rounded-lg border border-dashed border-[#E8E6DC]">
              No outbound webhooks configured for this organization.
            </div>
          ) : (
            <div className="divide-y divide-[#E8E6DC]">
              {webhooks.map((wh) => (
                <div key={wh.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-mono font-bold text-[#141413]">{wh.targetUrl}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wh.subscribedEvents.map((evt) => (
                        <span key={evt} className="px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E6DC] text-[10px] font-mono text-[#C15F3C]">
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestWebhook(wh.id)}
                      className="px-2.5 py-1 rounded border border-[#E8E6DC] bg-white font-semibold text-[#141413] hover:bg-[#F4F3EE]"
                    >
                      Send Test Ping
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="px-2.5 py-1 rounded border border-[#B42318]/30 bg-white font-semibold text-[#B42318] hover:bg-[#B42318]/5"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Register Outbound Webhook</h3>
              <button onClick={() => setShowWebhookModal(false)} className="text-[#625F59] hover:text-[#141413]">✕</button>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#141413] mb-1">Target Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/businessos"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Subscribed Event Topics (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="user.*, invoice.*, integration.*"
                  value={eventsInput}
                  onChange={(e) => setEventsInput(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs font-mono"
                />
                <p className="text-[11px] text-[#8A867D] mt-1">Use wildcards like &apos;invoice.*&apos; or &apos;*&apos; for all events.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] text-xs font-semibold text-[#625F59]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#141413] text-white text-xs font-semibold hover:bg-black"
                >
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
