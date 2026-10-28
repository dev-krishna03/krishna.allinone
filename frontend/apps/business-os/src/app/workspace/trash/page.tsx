'use client';

import * as React from 'react';
import Link from 'next/link';
import { WorkspaceSidebar } from '../workspace-sidebar';
import { Trash2, RotateCcw, AlertTriangle, FileText, ArrowLeft } from 'lucide-react';
import { WsPage } from '@business-os/types';

export default function WorkspaceTrashPage() {
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [allPages, setAllPages] = React.useState<WsPage[]>([]);
  const [trashPages, setTrashPages] = React.useState<WsPage[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchTrash = React.useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      const [trashRes, allRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages?isDeleted=true`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages`, {
          headers: { 'x-organization-id': tenantId },
        }),
      ]);

      if (trashRes.ok) setTrashPages(await trashRes.json());
      if (allRes.ok) setAllPages(await allRes.json());
    } catch (err) {
      console.error('Failed to load trash', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    async function loadIdentity() {
      try {
        const res = await fetch('http://localhost:3001/api/v1/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.organization?.id) {
            setOrgId(json.organization.id);
            await fetchTrash(json.organization.id);
          }
        }
      } catch (err) {
        console.error('Failed to load identity', err);
      }
    }
    loadIdentity();
  }, [fetchTrash]);

  const handleRestore = async (pageId: string) => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/restore`, {
        method: 'POST',
        headers: { 'x-organization-id': orgId },
      });
      if (res.ok) {
        await fetchTrash(orgId);
      }
    } catch (err) {
      console.error('Failed to restore page', err);
    }
  };

  const handlePermanentDelete = async (pageId: string) => {
    if (!orgId) return;
    if (!confirm('Permanently delete this document and its entire revision history? This cannot be undone.')) return;

    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/permanent`, {
        method: 'DELETE',
        headers: { 'x-organization-id': orgId },
      });
      if (res.ok) {
        await fetchTrash(orgId);
      }
    } catch (err) {
      console.error('Failed to permanently delete page', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F5]">
      {orgId && (
        <WorkspaceSidebar
          orgId={orgId}
          pages={allPages}
          onPageCreated={() => orgId && fetchTrash(orgId)}
        />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-8 py-6 border-b border-[#E8E6DC] bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#141413] flex items-center space-x-2">
              <Trash2 size={20} className="text-[#625F59]" />
              <span>Workspace Trash</span>
            </h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Soft-deleted documents can be restored or permanently removed by workspace owners.
            </p>
          </div>

          <Link
            href="/workspace"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#E8E6DC] text-[#141413] hover:bg-[#F4F3EE] flex items-center space-x-1.5"
          >
            <ArrowLeft size={13} />
            <span>Back to Active Docs</span>
          </Link>
        </header>

        <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl border border-[#E8E6DC] p-12 text-center text-xs text-[#625F59]">
              Loading deleted documents...
            </div>
          ) : trashPages.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8E6DC] p-12 text-center space-y-3">
              <Trash2 size={36} className="mx-auto text-[#625F59]/40" />
              <h3 className="text-sm font-semibold text-[#141413]">Trash is empty</h3>
              <p className="text-xs text-[#625F59]">No documents have been moved to the trash.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E6DC] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F3EE] border-b border-[#E8E6DC] text-[#625F59] font-medium">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Deleted On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {trashPages.map((page) => (
                    <tr key={page.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#141413] flex items-center space-x-2">
                        <FileText size={15} className="text-[#625F59]" />
                        <span>{page.title}</span>
                      </td>

                      <td className="py-3.5 px-4 text-[#625F59]">
                        {page.deletedAt
                          ? new Date(page.deletedAt).toLocaleString()
                          : 'Recently'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleRestore(page.id)}
                            className="px-3 py-1 rounded bg-[#F4F3EE] hover:bg-[#E8E6DC] text-[#476B3C] font-semibold flex items-center space-x-1"
                          >
                            <RotateCcw size={12} />
                            <span>Restore</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(page.id)}
                            className="px-3 py-1 rounded bg-[#B42318]/10 hover:bg-[#B42318]/20 text-[#B42318] font-semibold"
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
