'use client';

import * as React from 'react';
import { SuperAdminNav } from '../../../components/super-admin-nav';
import { createApiClient } from '@business-os/api-client';
import { FeatureRollout } from '@business-os/types';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = React.useState<FeatureRollout[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // New Flag Modal
  const [showModal, setShowModal] = React.useState(false);
  const [flagKey, setFlagKey] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [rolloutPercentage, setRolloutPercentage] = React.useState(50);
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Sandbox Evaluation State
  const [evalFlagKey, setEvalFlagKey] = React.useState('');
  const [evalOrgId, setEvalOrgId] = React.useState('');
  const [evalResult, setEvalResult] = React.useState<any | null>(null);
  const [evaluating, setEvaluating] = React.useState(false);

  const client = React.useMemo(() => createApiClient(), []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await client.listFeatureFlags();
      setFlags(data);
      if (data.length > 0 && !evalFlagKey) {
        setEvalFlagKey(data[0].flagKey);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await client.createFeatureFlag({
        flagKey: flagKey.trim().toLowerCase().replace(/\s+/g, '_'),
        name,
        description,
        isEnabled,
        rolloutPercentage,
      });
      setShowModal(false);
      setFlagKey('');
      setName('');
      setDescription('');
      await fetchData();
    } catch (err: any) {
      alert(`Error creating feature flag: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (flag: FeatureRollout) => {
    try {
      await client.updateFeatureFlag(flag.id, {
        isEnabled: !flag.isEnabled,
      });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to toggle flag: ${err.message}`);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalFlagKey) return;
    try {
      setEvaluating(true);
      const res = await fetch(
        `http://localhost:3001/api/v1/platform/feature-flags/${evalFlagKey}/evaluate?organizationId=${encodeURIComponent(
          evalOrgId,
        )}`,
      );
      const data = await res.json();
      setEvalResult(data);
    } catch (err: any) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 lg:p-10 font-sans text-[#141413]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DC] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold text-sm">
                FLG
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">Feature Rollouts & Governance</h1>
            </div>
            <p className="text-xs text-[#625F59] mt-1">
              Phased feature rollouts, percentage ramp-ups, tenant whitelisting, and live evaluation sandboxing.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A84E31] transition-colors"
          >
            + Create Feature Flag
          </button>
        </header>

        <SuperAdminNav />

        {error && (
          <div className="p-4 rounded-xl border border-[#B42318]/30 bg-[#B42318]/5 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Feature Flags Table */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#141413]">Active Feature Flags</h2>
              <p className="text-xs text-[#625F59]">
                Toggle capability rollout rules and inspect percentage distributions across customer organizations.
              </p>
            </div>
            <span className="text-xs bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#E8E6DC] font-mono font-semibold text-[#141413]">
              {flags.length} Flags Configured
            </span>
          </div>

          {flags.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8A867D] bg-[#FAF9F5] rounded-lg border border-dashed border-[#E8E6DC]">
              No feature flags registered yet. Click &quot;Create Feature Flag&quot; to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E6DC] text-[#625F59]">
                    <th className="pb-2 font-medium">Flag Key</th>
                    <th className="pb-2 font-medium">Name & Purpose</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Rollout Ramp</th>
                    <th className="pb-2 font-medium">Targeted Orgs</th>
                    <th className="pb-2 font-medium text-right">Switch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {flags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 font-mono font-bold text-[#C15F3C]">{flag.flagKey}</td>
                      <td className="py-3">
                        <div className="font-semibold text-[#141413]">{flag.name}</div>
                        <div className="text-[11px] text-[#625F59] truncate max-w-sm">{flag.description}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            flag.isEnabled
                              ? 'bg-[#476B3C]/10 text-[#476B3C]'
                              : 'bg-[#625F59]/10 text-[#625F59]'
                          }`}
                        >
                          {flag.isEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 font-mono">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-[#E8E6DC] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#C15F3C] h-full"
                              style={{ width: `${flag.rolloutPercentage}%` }}
                            />
                          </div>
                          <span>{flag.rolloutPercentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-[11px] text-[#625F59]">
                        {flag.targetOrganizationIds.length > 0
                          ? `${flag.targetOrganizationIds.length} whitelisted`
                          : 'Global rollout rule'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggle(flag)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            flag.isEnabled
                              ? 'border border-[#B42318] text-[#B42318] hover:bg-[#B42318]/5'
                              : 'bg-[#476B3C] text-white hover:bg-[#3D5B33]'
                          }`}
                        >
                          {flag.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sandbox Evaluation Tool */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#141413]">Live Flag Evaluation Sandbox</h2>
            <p className="text-xs text-[#625F59]">
              Test deterministic rollout hash resolution for a specific flag and organization context.
            </p>
          </div>

          <form onSubmit={handleEvaluate} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-[#141413] mb-1">Select Flag</label>
              <select
                value={evalFlagKey}
                onChange={(e) => setEvalFlagKey(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
              >
                {flags.map((f) => (
                  <option key={f.id} value={f.flagKey}>
                    {f.flagKey} ({f.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-[#141413] mb-1">Organization ID</label>
              <input
                type="text"
                placeholder="e.g. acme-org-uuid"
                value={evalOrgId}
                onChange={(e) => setEvalOrgId(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={evaluating}
              className="px-4 py-2 rounded-lg bg-[#141413] text-white text-xs font-semibold hover:bg-black"
            >
              {evaluating ? 'Evaluating...' : 'Evaluate'}
            </button>
          </form>

          {evalResult && (
            <div className="p-4 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#141413]">{evalResult.flagKey}:</span>{' '}
                <span className="text-[#625F59]">Reason: {evalResult.reason}</span>
              </div>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  evalResult.isEnabled
                    ? 'bg-[#476B3C]/10 text-[#476B3C]'
                    : 'bg-[#B42318]/10 text-[#B42318]'
                }`}
              >
                {evalResult.isEnabled ? 'ACTIVE / ON' : 'OFF'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Create Feature Rollout Flag</h3>
              <button onClick={() => setShowModal(false)} className="text-[#625F59] hover:text-[#141413]">✕</button>
            </div>

            <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#141413] mb-1">Flag Key (unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ai_workflow_automations"
                  value={flagKey}
                  onChange={(e) => setFlagKey(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Workflow Automations"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#141413] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What capability does this rollout enable?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-[#141413]">Rollout Percentage ({rolloutPercentage}%)</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={rolloutPercentage}
                  onChange={(e) => setRolloutPercentage(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C15F3C]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="accent-[#C15F3C]"
                />
                <label htmlFor="enabledCheck" className="font-semibold text-[#141413]">
                  Enable flag immediately upon creation
                </label>
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
                  className="px-4 py-1.5 rounded-lg bg-[#C15F3C] text-white text-xs font-semibold hover:bg-[#A84E31] disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
