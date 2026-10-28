'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspaceSidebar } from './workspace-sidebar';
import {
  BookOpen,
  Plus,
  Star,
  FileText,
  Clock,
  Copy,
  Trash2,
  ExternalLink,
  LayoutTemplate,
  Layers,
} from 'lucide-react';
import { WsPage } from '@business-os/types';

export default function WorkspaceOverviewPage() {
  const router = useRouter();
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<WsPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'all' | 'favorites' | 'templates'>('all');
  const [creating, setCreating] = React.useState(false);

  const fetchPages = React.useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages`, {
        headers: { 'x-organization-id': tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error('Failed to load workspace pages', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch('http://localhost:3001/api/v1/me');
        if (res.ok) {
          const userContext = await res.json();
          if (userContext?.organization?.id) {
            setOrgId(userContext.organization.id);
            await fetchPages(userContext.organization.id);
          }
        }
      } catch (err) {
        console.error('Failed to load identity', err);
      }
    }
    loadContext();
  }, [fetchPages]);

  const handleCreate = async () => {
    if (!orgId || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          icon: 'FileText',
        }),
      });
      if (res.ok) {
        const page = await res.json();
        router.push(`/workspace/pages/${page.id}`);
      }
    } catch (err) {
      console.error('Failed to create page', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (pageId: string) => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchPages(orgId);
      }
    } catch (err) {
      console.error('Failed to duplicate page', err);
    }
  };

  const handleToggleFavorite = async (pageId: string) => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/favorite`, {
        method: 'POST',
        headers: { 'x-organization-id': orgId },
      });
      if (res.ok) {
        await fetchPages(orgId);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!orgId) return;
    if (!confirm('Move this page to trash?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': orgId },
      });
      if (res.ok) {
        await fetchPages(orgId);
      }
    } catch (err) {
      console.error('Failed to delete page', err);
    }
  };

  const displayedPages = React.useMemo(() => {
    if (activeTab === 'favorites') return pages.filter((p) => p.isFavorite && !p.isDeleted);
    if (activeTab === 'templates') return pages.filter((p) => p.isTemplate && !p.isDeleted);
    return pages.filter((p) => !p.isDeleted);
  }, [pages, activeTab]);

  return (
    <div className="flex min-h-screen bg-[#FAF9F5]">
      {orgId && (
        <WorkspaceSidebar
          orgId={orgId}
          pages={pages}
          onPageCreated={() => orgId && fetchPages(orgId)}
        />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-8 py-6 border-b border-[#E8E6DC] bg-white/70 backdrop-blur flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#141413]">Workspace Documents</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Modular knowledge base, rich-text collaborative pages, and revision checkpoints.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/workspace/templates"
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E8E6DC] text-[#141413] hover:bg-[#F4F3EE] flex items-center space-x-1.5 transition-colors"
            >
              <LayoutTemplate size={14} className="text-[#C15F3C]" />
              <span>Browse Templates</span>
            </Link>

            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Plus size={15} />
              <span>{creating ? 'Creating...' : 'New Page'}</span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E8E6DC] shadow-sm">
              <div className="text-xs font-medium text-[#625F59]">Total Documents</div>
              <div className="text-2xl font-bold text-[#141413] mt-1">
                {pages.filter((p) => !p.isDeleted).length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E8E6DC] shadow-sm">
              <div className="text-xs font-medium text-[#625F59]">Starred Favorites</div>
              <div className="text-2xl font-bold text-[#C15F3C] mt-1">
                {pages.filter((p) => p.isFavorite && !p.isDeleted).length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E8E6DC] shadow-sm">
              <div className="text-xs font-medium text-[#625F59]">Published Online</div>
              <div className="text-2xl font-bold text-[#476B3C] mt-1">
                {pages.filter((p) => p.isPublished && !p.isDeleted).length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E8E6DC] shadow-sm">
              <div className="text-xs font-medium text-[#625F59]">Templates Ready</div>
              <div className="text-2xl font-bold text-[#2F5C83] mt-1">
                {pages.filter((p) => p.isTemplate && !p.isDeleted).length}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-[#E8E6DC] space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-[#C15F3C] text-[#C15F3C]'
                  : 'border-transparent text-[#625F59] hover:text-[#141413]'
              }`}
            >
              All Documents ({pages.filter((p) => !p.isDeleted).length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'favorites'
                  ? 'border-[#C15F3C] text-[#C15F3C]'
                  : 'border-transparent text-[#625F59] hover:text-[#141413]'
              }`}
            >
              Favorites ({pages.filter((p) => p.isFavorite && !p.isDeleted).length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-[#C15F3C] text-[#C15F3C]'
                  : 'border-transparent text-[#625F59] hover:text-[#141413]'
              }`}
            >
              Templates ({pages.filter((p) => p.isTemplate && !p.isDeleted).length})
            </button>
          </div>

          {/* Content Table */}
          {loading ? (
            <div className="bg-white rounded-xl border border-[#E8E6DC] p-12 text-center text-xs text-[#625F59]">
              Loading workspace documents...
            </div>
          ) : displayedPages.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8E6DC] p-12 text-center space-y-3">
              <BookOpen size={36} className="mx-auto text-[#625F59]/50" />
              <h3 className="text-sm font-semibold text-[#141413]">No documents found</h3>
              <p className="text-xs text-[#625F59] max-w-sm mx-auto">
                Get started by creating a new document or pick a starter template from the catalog.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white transition-colors"
              >
                Create First Document
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E6DC] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F3EE] border-b border-[#E8E6DC] text-[#625F59] font-medium">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {displayedPages.map((page) => (
                    <tr key={page.id} className="hover:bg-[#FAF9F5] transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(page.id)}
                            className="text-[#625F59] hover:text-[#C15F3C]"
                            title="Favorite"
                          >
                            <Star
                              size={14}
                              className={page.isFavorite ? 'fill-[#C15F3C] text-[#C15F3C]' : ''}
                            />
                          </button>

                          <Link
                            href={`/workspace/pages/${page.id}`}
                            className="font-medium text-[#141413] hover:text-[#C15F3C] flex items-center space-x-2"
                          >
                            <FileText size={15} className="text-[#625F59]" />
                            <span>{page.title}</span>
                          </Link>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#625F59]">
                        {(page as any).createdBy?.fullName || 'Organization Member'}
                      </td>

                      <td className="py-3.5 px-4 text-[#625F59]">
                        <span className="font-mono text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#E8E6DC]">
                          v{page.currentVersion}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {page.isPublished ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#476B3C]/10 text-[#476B3C]">
                            <span>Public</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F3EE] text-[#625F59]">
                            Private
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#625F59]">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/workspace/pages/${page.id}`}
                            className="p-1 rounded text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE]"
                            title="Open Document"
                          >
                            <ExternalLink size={14} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(page.id)}
                            className="p-1 rounded text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE]"
                            title="Duplicate"
                          >
                            <Copy size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(page.id)}
                            className="p-1 rounded text-[#625F59] hover:text-[#B42318] hover:bg-[#F4F3EE]"
                            title="Move to Trash"
                          >
                            <Trash2 size={14} />
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
