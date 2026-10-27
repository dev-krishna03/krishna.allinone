'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface MemberItem {
  id: string;
  role: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface TeamItem {
  id: string;
  name: string;
  code: string;
}

interface FieldPolicyItem {
  id: string;
  roleId?: string | null;
  resourceType: string;
  fieldName: string;
  policy: string;
  maskPattern?: string | null;
  role?: { id: string; name: string } | null;
}

interface RecordGrantItem {
  id: string;
  resourceType: string;
  recordId: string;
  granteeType: string;
  granteeId: string;
  accessLevel: string;
  createdAt: string;
}

interface SimulationResult {
  permit: boolean;
  decision: 'ALLOW' | 'DENY';
  reason: string;
  matchedRole?: string;
  grantedScope?: string;
  effectiveAccessLevel?: string;
  fieldPolicies?: {
    fieldName: string;
    policy: string;
    maskPattern?: string | null;
  }[];
  evaluatedAt: string;
}

export default function AccessPoliciesPage() {
  const [members, setMembers] = React.useState<MemberItem[]>([]);
  const [teams, setTeams] = React.useState<TeamItem[]>([]);
  const [fieldPolicies, setFieldPolicies] = React.useState<FieldPolicyItem[]>([]);
  const [shares, setShares] = React.useState<RecordGrantItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Simulator Form State
  const [simMemberId, setSimMemberId] = React.useState('');
  const [simResource, setSimResource] = React.useState('invoices');
  const [simAction, setSimAction] = React.useState('read');
  const [simRecordOwnerId, setSimRecordOwnerId] = React.useState('');
  const [simRecordTeamId, setSimRecordTeamId] = React.useState('');
  const [simulating, setSimulating] = React.useState(false);
  const [simResult, setSimResult] = React.useState<SimulationResult | null>(null);

  // Field Policy Modal State
  const [showFieldModal, setShowFieldModal] = React.useState(false);
  const [fpResource, setFpResource] = React.useState('invoices');
  const [fpField, setFpField] = React.useState('');
  const [fpPolicy, setFpPolicy] = React.useState('MASK');
  const [fpPattern, setFpPattern] = React.useState('***-**-####');

  // Record Share Modal State
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareResource, setShareResource] = React.useState('deals');
  const [shareRecordId, setShareRecordId] = React.useState('');
  const [shareGranteeType, setShareGranteeType] = React.useState<'USER' | 'TEAM'>('USER');
  const [shareGranteeId, setShareGranteeId] = React.useState('');
  const [shareAccessLevel, setShareAccessLevel] = React.useState('READ');

  const getOrgId = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('organizationId') || '';
    }
    return '';
  };

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const orgId = getOrgId();
    return {
      'Content-Type': 'application/json',
      'x-organization-id': orgId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      let targetOrgId = getOrgId();

      if (!targetOrgId) {
        const meRes = await fetch('http://localhost:3001/api/v1/me', { headers: getHeaders() });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.organization?.id) {
            targetOrgId = meData.organization.id;
            sessionStorage.setItem('organizationId', targetOrgId);
          }
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-organization-id': targetOrgId,
        ...(typeof window !== 'undefined' && sessionStorage.getItem('accessToken')
          ? { Authorization: `Bearer ${sessionStorage.getItem('accessToken')}` }
          : {}),
      };

      const [membersRes, teamsRes, fpRes, sharesRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/members`, { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/teams`, { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/field-policies`, { headers }),
        fetch(`http://localhost:3001/api/v1/organizations/${targetOrgId}/shares`, { headers }),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData);
        if (mData.length > 0 && !simMemberId) {
          setSimMemberId(mData[0].id);
          setShareGranteeId(mData[0].id);
        }
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData);
      }

      if (fpRes.ok) {
        setFieldPolicies(await fpRes.json());
      }

      if (sharesRes.ok) {
        setShares(await sharesRes.json());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMemberId) return;

    try {
      setSimulating(true);
      const orgId = getOrgId();

      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/policy/simulate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          memberId: simMemberId,
          resource: simResource,
          action: simAction,
          recordOwnerId: simRecordOwnerId || undefined,
          recordTeamId: simRecordTeamId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Simulation request failed');
      }

      const result = await res.json();
      setSimResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveFieldPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpField) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/field-policies`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          resourceType: fpResource,
          fieldName: fpField,
          policy: fpPolicy,
          maskPattern: fpPattern,
        }),
      });

      if (!res.ok) throw new Error('Failed to save field policy');

      setMessage(`Field policy for "${fpField}" saved`);
      setShowFieldModal(false);
      setFpField('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFieldPolicy = async (policyId: string) => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/field-policies/${policyId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Delete policy failed');
      setMessage('Field policy deleted');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareRecordId || !shareGranteeId) return;

    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/shares`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          resourceType: shareResource,
          recordId: shareRecordId,
          granteeType: shareGranteeType,
          granteeId: shareGranteeId,
          accessLevel: shareAccessLevel,
        }),
      });

      if (!res.ok) throw new Error('Failed to create record grant');

      setMessage(`Record access granted on ${shareResource} #${shareRecordId}`);
      setShowShareModal(false);
      setShareRecordId('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteShare = async (grantId: string) => {
    try {
      const orgId = getOrgId();
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/shares/${grantId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Revoke share failed');
      setMessage('Record grant revoked');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Top Bar */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-xs font-semibold text-[#625F59] hover:text-[#C15F3C]">
              ← Dashboard
            </Link>
            <span className="text-xs text-[#8A867D]">/</span>
            <h1 className="font-bold text-sm text-[#141413]">ABAC & Field Security Policies</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Access Policies & Interactive Simulator</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Simulate authorization scenarios with deny-by-default logic, manage field-level masking (Hide/Mask), and award direct record access grants.
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-md bg-[#476B3C]/10 border border-[#476B3C]/20 text-xs text-[#476B3C]">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Interactive Policy Simulator Card */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-[#E8E6DC] pb-3">
            <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <span>⚡</span> Interactive Access Policy Simulator
            </h3>
            <p className="text-xs text-[#625F59] mt-0.5">
              Dry-run any combination of member, action, resource, ownership and team scope without modifying live data.
            </p>
          </div>

          <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1">Evaluating Member</label>
              <select
                value={simMemberId}
                onChange={(e) => setSimMemberId(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1">Target Resource</label>
              <select
                value={simResource}
                onChange={(e) => setSimResource(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                <option value="invoices">invoices (Billing)</option>
                <option value="deals">deals (CRM)</option>
                <option value="items">items (Catalog)</option>
                <option value="sensitive_data">sensitive_data (Financials)</option>
                <option value="reports">reports (Financials)</option>
                <option value="logs">logs (Audit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1">Attempted Action</label>
              <select
                value={simAction}
                onChange={(e) => setSimAction(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                <option value="read">read</option>
                <option value="create">create</option>
                <option value="update">update</option>
                <option value="delete">delete</option>
                <option value="approve">approve</option>
                <option value="execute">execute</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={simulating}
                className="w-full rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31] disabled:opacity-50 transition-colors"
              >
                {simulating ? 'Evaluating...' : 'Simulate Policy Check'}
              </button>
            </div>

            {/* Optional ABAC Context Attributes */}
            <div>
              <label className="block text-xs font-semibold text-[#625F59] mb-1">
                Record Owner (ABAC Scope)
              </label>
              <select
                value={simRecordOwnerId}
                onChange={(e) => setSimRecordOwnerId(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                <option value="">Same as Evaluating Member (Self-owned)</option>
                <option value="other-user-999">Another Member (Foreign Owned)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#625F59] mb-1">
                Record Team (Team Scope)
              </label>
              <select
                value={simRecordTeamId}
                onChange={(e) => setSimRecordTeamId(e.target.value)}
                className="w-full rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-hidden"
              >
                <option value="">Any Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {/* Simulation Output Card */}
          {simResult && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                simResult.permit
                  ? 'bg-[#476B3C]/5 border-[#476B3C]/30 text-[#141413]'
                  : 'bg-[#B42318]/5 border-[#B42318]/30 text-[#141413]'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase ${
                      simResult.permit
                        ? 'bg-[#476B3C] text-white'
                        : 'bg-[#B42318] text-white'
                    }`}
                  >
                    Decision: {simResult.decision}
                  </span>
                  {simResult.matchedRole && (
                    <span className="text-xs font-semibold text-[#141413] bg-white px-2 py-0.5 rounded border border-[#E8E6DC]">
                      Matched Role: {simResult.matchedRole}
                    </span>
                  )}
                  {simResult.grantedScope && (
                    <span className="text-xs text-[#625F59] bg-white px-2 py-0.5 rounded border border-[#E8E6DC]">
                      Scope: {simResult.grantedScope}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#625F59] font-mono">
                  Evaluated at: {new Date(simResult.evaluatedAt).toLocaleTimeString()}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-[#141413]">{simResult.reason}</p>

              {simResult.fieldPolicies && simResult.fieldPolicies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <div className="text-xs font-semibold text-[#141413] mb-1">
                    Active Field Security Policies for this Response:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {simResult.fieldPolicies.map((fp) => (
                      <span
                        key={fp.fieldName}
                        className="text-[11px] bg-white px-2 py-1 rounded border border-[#E8E6DC] text-[#141413]"
                      >
                        <code>{fp.fieldName}</code>: <strong>{fp.policy}</strong>{' '}
                        {fp.maskPattern ? `(${fp.maskPattern})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field Policies & Direct Sharing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field-Level Policies */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">Field-Level Redaction & Masking</h3>
                <p className="text-[11px] text-[#625F59]">Protect SSN, margins, and banking info</p>
              </div>
              <button
                onClick={() => setShowFieldModal(true)}
                className="rounded bg-[#C15F3C] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#A84E31]"
              >
                + Add Rule
              </button>
            </div>

            {fieldPolicies.length === 0 ? (
              <p className="text-xs text-[#625F59] py-6 text-center">No field policies configured.</p>
            ) : (
              <div className="divide-y divide-[#E8E6DC]">
                {fieldPolicies.map((fp) => (
                  <div key={fp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#141413]">
                        {fp.resourceType}.{fp.fieldName}
                      </div>
                      <div className="text-[11px] text-[#625F59]">
                        Policy: <span className="font-semibold text-[#141413]">{fp.policy}</span>{' '}
                        {fp.maskPattern ? `(pattern: ${fp.maskPattern})` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFieldPolicy(fp.id)}
                      className="text-xs text-[#B42318] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Record-Level Sharing Grants */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">Direct Record Grants (ABAC Sharing)</h3>
                <p className="text-[11px] text-[#625F59]">Explicit cross-team or single-record grants</p>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded bg-[#C15F3C] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#A84E31]"
              >
                + Share Record
              </button>
            </div>

            {shares.length === 0 ? (
              <p className="text-xs text-[#625F59] py-6 text-center">No active record shares.</p>
            ) : (
              <div className="divide-y divide-[#E8E6DC]">
                {shares.map((sh) => (
                  <div key={sh.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#141413]">
                        {sh.resourceType} #{sh.recordId}
                      </div>
                      <div className="text-[11px] text-[#625F59]">
                        Granted to {sh.granteeType.toLowerCase()} with Level: <strong>{sh.accessLevel}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(sh.id)}
                      className="text-xs text-[#B42318] hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Field Policy Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Create Field Security Rule</h3>
              <button
                onClick={() => setShowFieldModal(false)}
                className="text-xs text-[#625F59] hover:text-[#141413]"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveFieldPolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Resource</label>
                <select
                  value={fpResource}
                  onChange={(e) => setFpResource(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                >
                  <option value="invoices">invoices</option>
                  <option value="deals">deals</option>
                  <option value="sensitive_data">sensitive_data</option>
                  <option value="financials">financials</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Field Name *</label>
                <input
                  type="text"
                  required
                  value={fpField}
                  onChange={(e) => setFpField(e.target.value)}
                  placeholder="e.g. bankAccountNumber or internalMarginCost"
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Enforcement Policy</label>
                <select
                  value={fpPolicy}
                  onChange={(e) => setFpPolicy(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                >
                  <option value="MASK">MASK (Redact or pattern mask)</option>
                  <option value="HIDE">HIDE (Omit completely from response)</option>
                  <option value="READ_ONLY">READ_ONLY (Prevent mutations)</option>
                </select>
              </div>

              {fpPolicy === 'MASK' && (
                <div>
                  <label className="block text-xs font-semibold text-[#141413] mb-1">
                    Mask Pattern (# preserves tail digits)
                  </label>
                  <input
                    type="text"
                    value={fpPattern}
                    onChange={(e) => setFpPattern(e.target.value)}
                    placeholder="e.g. ***-**-#### or REDACTED"
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className="rounded-md border border-[#E8E6DC] px-3.5 py-1.5 text-xs font-semibold text-[#625F59]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#C15F3C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31]"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Record Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <h3 className="font-bold text-sm text-[#141413]">Direct Record Sharing Grant</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-xs text-[#625F59] hover:text-[#141413]"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveShare} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Resource Type</label>
                <select
                  value={shareResource}
                  onChange={(e) => setShareResource(e.target.value)}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                >
                  <option value="deals">deals</option>
                  <option value="invoices">invoices</option>
                  <option value="documents">documents</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">Record ID *</label>
                <input
                  type="text"
                  required
                  value={shareRecordId}
                  onChange={(e) => setShareRecordId(e.target.value)}
                  placeholder="e.g. deal-east-401"
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141413] mb-1">Grantee Type</label>
                  <select
                    value={shareGranteeType}
                    onChange={(e) => setShareGranteeType(e.target.value as any)}
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                  >
                    <option value="USER">User (Member)</option>
                    <option value="TEAM">Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141413] mb-1">Access Level</label>
                  <select
                    value={shareAccessLevel}
                    onChange={(e) => setShareAccessLevel(e.target.value)}
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                  >
                    <option value="READ">READ</option>
                    <option value="WRITE">WRITE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413] mb-1">
                  Recipient ({shareGranteeType === 'USER' ? 'Member' : 'Team'}) *
                </label>
                {shareGranteeType === 'USER' ? (
                  <select
                    value={shareGranteeId}
                    onChange={(e) => setShareGranteeId(e.target.value)}
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.fullName} ({m.user?.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={shareGranteeId}
                    onChange={(e) => setShareGranteeId(e.target.value)}
                    className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-1.5 text-xs text-[#141413]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6DC]">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="rounded-md border border-[#E8E6DC] px-3.5 py-1.5 text-xs font-semibold text-[#625F59]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#C15F3C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31]"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
