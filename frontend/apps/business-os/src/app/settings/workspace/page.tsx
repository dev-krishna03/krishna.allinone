'use client';

import * as React from 'react';
import { SettingsNav } from '../settings-nav';
import { BookOpen, Shield, Globe, Users, Save, Check } from 'lucide-react';
import { WsWorkspace } from '@business-os/types';

export default function WorkspaceSettingsPage() {
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [workspace, setWorkspace] = React.useState<WsWorkspace | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Form states
  const [allowPublicPublishing, setAllowPublicPublishing] = React.useState(true);
  const [defaultPermission, setDefaultPermission] = React.useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [autoCheckpointOnPublish, setAutoCheckpointOnPublish] = React.useState(true);
  const [exportRestrictions, setExportRestrictions] = React.useState(false);

  React.useEffect(() => {
    async function loadWorkspaceSettings() {
      try {
        setLoading(true);
        const meRes = await fetch('http://localhost:3001/api/v1/me');
        if (meRes.ok) {
          const userContext = await meRes.json();
          if (userContext?.organization?.id) {
            setOrgId(userContext.organization.id);
            const wsRes = await fetch(
              `http://localhost:3001/api/v1/organizations/${userContext.organization.id}/workspace`,
              { headers: { 'x-organization-id': userContext.organization.id } },
            );
            if (wsRes.ok) {
              const wsList: WsWorkspace[] = await wsRes.json();
              if (wsList.length > 0) {
                const def = wsList[0];
                setWorkspace(def);
                if (def.settings) {
                  setAllowPublicPublishing(def.settings.allowPublicPublishing ?? true);
                  setDefaultPermission(def.settings.defaultPermission || 'EDITOR');
                  setAutoCheckpointOnPublish(def.settings.autoCheckpointOnPublish ?? true);
                  setExportRestrictions(def.settings.exportRestrictions ?? false);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load workspace settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !workspace) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/organizations/${orgId}/workspace/${workspace.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
          },
          body: JSON.stringify({
            settings: {
              allowPublicPublishing,
              defaultPermission,
              autoCheckpointOnPublish,
              exportRestrictions,
            },
          }),
        },
      );

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update workspace settings', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141413]">Organization Settings</h1>
          <p className="text-xs text-[#625F59] mt-1">
            Configure organization-wide governance, security, and document publishing rules.
          </p>
        </div>

        <SettingsNav />

        {loading ? (
          <div className="bg-white rounded-xl border border-[#E8E6DC] p-12 text-center text-xs text-[#625F59]">
            Loading workspace settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#E8E6DC] p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-[#E8E6DC]">
              <div className="w-8 h-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold">
                <BookOpen size={16} />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-[#141413]">Document Governance &amp; Publishing Policy</h2>
                <p className="text-xs text-[#625F59]">Manage defaults for new documents and public web sharing</p>
              </div>
            </div>

            {/* Public Publishing Boundary */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5]">
              <div className="space-y-1 pr-6">
                <div className="flex items-center space-x-2">
                  <Globe size={15} className="text-[#C15F3C]" />
                  <label htmlFor="pub-toggle" className="text-xs font-semibold text-[#141413] cursor-pointer">
                    Enable Public Web Publishing
                  </label>
                </div>
                <p className="text-[11px] text-[#625F59] leading-relaxed">
                  When enabled, document owners can publish standalone links accessible to external guests without authentication.
                </p>
              </div>
              <input
                id="pub-toggle"
                type="checkbox"
                checked={allowPublicPublishing}
                onChange={(e) => setAllowPublicPublishing(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DC] text-[#C15F3C] focus:ring-[#C15F3C]"
              />
            </div>

            {/* Default Member Access */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#141413]">
                Default Member Access Level for New Documents
              </label>
              <select
                value={defaultPermission}
                onChange={(e) => setDefaultPermission(e.target.value as any)}
                className="w-full text-xs p-2.5 border border-[#E8E6DC] rounded-lg bg-white text-[#141413] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              >
                <option value="EDITOR">Editor - All organization members can edit unless restricted</option>
                <option value="VIEWER">Viewer - Members can only read until explicitly granted edit rights</option>
              </select>
            </div>

            {/* Checkpoint on publish */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5]">
              <div className="space-y-1 pr-6">
                <div className="flex items-center space-x-2">
                  <Shield size={15} className="text-[#476B3C]" />
                  <label htmlFor="chk-toggle" className="text-xs font-semibold text-[#141413] cursor-pointer">
                    Automatic Named Checkpoint on Public Release
                  </label>
                </div>
                <p className="text-[11px] text-[#625F59] leading-relaxed">
                  Automatically generates an immutable version revision whenever a document is published to the public internet.
                </p>
              </div>
              <input
                id="chk-toggle"
                type="checkbox"
                checked={autoCheckpointOnPublish}
                onChange={(e) => setAutoCheckpointOnPublish(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DC] text-[#C15F3C] focus:ring-[#C15F3C]"
              />
            </div>

            {/* Export restrictions */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5]">
              <div className="space-y-1 pr-6">
                <div className="flex items-center space-x-2">
                  <Users size={15} className="text-[#2F5C83]" />
                  <label htmlFor="exp-toggle" className="text-xs font-semibold text-[#141413] cursor-pointer">
                    Restrict Bulk Document Exports
                  </label>
                </div>
                <p className="text-[11px] text-[#625F59] leading-relaxed">
                  Only organization owners and compliance officers can export workspace documentation bundles.
                </p>
              </div>
              <input
                id="exp-toggle"
                type="checkbox"
                checked={exportRestrictions}
                onChange={(e) => setExportRestrictions(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DC] text-[#C15F3C] focus:ring-[#C15F3C]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E8E6DC]">
              {savedSuccess ? (
                <span className="text-xs text-[#476B3C] font-semibold flex items-center space-x-1">
                  <Check size={14} />
                  <span>Workspace governance policy saved successfully</span>
                </span>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white shadow-sm flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
