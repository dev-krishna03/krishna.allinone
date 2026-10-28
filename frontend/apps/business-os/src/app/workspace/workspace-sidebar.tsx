'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Star,
  FileText,
  Trash2,
  LayoutTemplate,
  Search,
  Settings,
  MoreHorizontal,
  Home,
} from 'lucide-react';
import { WsPage } from '@business-os/types';

interface WorkspaceSidebarProps {
  orgId: string;
  pages: WsPage[];
  onPageCreated?: () => void;
}

export function WorkspaceSidebar({ orgId, pages, onPageCreated }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  // Toggle tree expansion
  const toggleExpand = (pageId: string) => {
    setExpanded((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const createNewPage = async (parentId?: string) => {
    if (creating) return;
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
          parentId,
          icon: 'FileText',
        }),
      });

      if (res.ok) {
        const newPage = await res.json();
        if (onPageCreated) onPageCreated();
        router.push(`/workspace/pages/${newPage.id}`);
      }
    } catch (err) {
      console.error('Failed to create page', err);
    } finally {
      setCreating(false);
    }
  };

  // Build root pages and hierarchy lookup
  const rootPages = pages.filter((p) => !p.parentId && !p.isDeleted && !p.isTemplate);
  const favorites = pages.filter((p) => p.isFavorite && !p.isDeleted);
  const childrenMap = React.useMemo(() => {
    const map: Record<string, WsPage[]> = {};
    for (const p of pages) {
      if (p.parentId && !p.isDeleted && !p.isTemplate) {
        if (!map[p.parentId]) map[p.parentId] = [];
        map[p.parentId].push(p);
      }
    }
    return map;
  }, [pages]);

  const filteredPages = searchTerm.trim()
    ? pages.filter(
        (p) =>
          !p.isDeleted &&
          !p.isTemplate &&
          p.title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : null;

  const renderPageItem = (page: WsPage, level = 0) => {
    const hasChildren = (childrenMap[page.id]?.length || 0) > 0;
    const isCurrentActive = pathname === `/workspace/pages/${page.id}`;
    const isExpanded = expanded[page.id] ?? false;

    return (
      <div key={page.id} className="group">
        <div
          style={{ paddingLeft: `${Math.max(level * 14 + 10, 10)}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm font-medium transition-colors ${
            isCurrentActive
              ? 'bg-[#C15F3C] text-white'
              : 'text-[#141413] hover:bg-[#F4F3EE]'
          }`}
        >
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(page.id);
                }}
                className={`p-0.5 rounded hover:bg-black/10 ${
                  isCurrentActive ? 'text-white' : 'text-[#625F59]'
                }`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-4" />
            )}

            <Link
              href={`/workspace/pages/${page.id}`}
              className="flex items-center space-x-2 flex-1 truncate"
            >
              <FileText size={15} className={isCurrentActive ? 'text-white' : 'text-[#625F59]'} />
              <span className="truncate">{page.title || 'Untitled'}</span>
            </Link>
          </div>

          <div className="hidden group-hover:flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                createNewPage(page.id);
              }}
              title="Add subpage"
              className={`p-1 rounded hover:bg-black/10 ${
                isCurrentActive ? 'text-white' : 'text-[#625F59]'
              }`}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {childrenMap[page.id].map((child) => renderPageItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[#F4F3EE] border-r border-[#E8E6DC] flex flex-col h-screen select-none">
      {/* Workspace Header */}
      <div className="p-4 border-b border-[#E8E6DC] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C15F3C] text-white flex items-center justify-center font-bold">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-[#141413]">Workspace</h2>
            <p className="text-xs text-[#625F59]">Docs & Knowledge Base</p>
          </div>
        </div>

        <Link
          href="/settings/workspace"
          className="text-[#625F59] hover:text-[#141413] p-1.5 rounded-md hover:bg-[#E8E6DC]/50 transition-colors"
          title="Workspace Settings"
        >
          <Settings size={15} />
        </Link>
      </div>

      {/* Action Bar */}
      <div className="p-3 space-y-2 border-b border-[#E8E6DC]/60">
        <button
          type="button"
          onClick={() => createNewPage()}
          disabled={creating}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus size={14} />
          <span>{creating ? 'Creating...' : 'New Document'}</span>
        </button>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[#625F59]" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E8E6DC] rounded-lg text-[#141413] placeholder-[#625F59] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
          />
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
        {filteredPages ? (
          <div>
            <div className="px-2 py-1 font-semibold text-[#625F59] uppercase tracking-wider text-[10px]">
              Search Results ({filteredPages.length})
            </div>
            <div className="space-y-0.5 mt-1">
              {filteredPages.map((p) => renderPageItem(p, 0))}
            </div>
          </div>
        ) : (
          <>
            {/* Quick Links */}
            <div className="space-y-0.5">
              <Link
                href="/workspace"
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  pathname === '/workspace'
                    ? 'bg-[#E8E6DC] text-[#141413]'
                    : 'text-[#625F59] hover:text-[#141413] hover:bg-[#E8E6DC]/40'
                }`}
              >
                <Home size={14} />
                <span>Overview & All Docs</span>
              </Link>

              <Link
                href="/workspace/templates"
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  pathname === '/workspace/templates'
                    ? 'bg-[#E8E6DC] text-[#141413]'
                    : 'text-[#625F59] hover:text-[#141413] hover:bg-[#E8E6DC]/40'
                }`}
              >
                <LayoutTemplate size={14} />
                <span>Templates</span>
              </Link>

              <Link
                href="/workspace/trash"
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  pathname === '/workspace/trash'
                    ? 'bg-[#E8E6DC] text-[#141413]'
                    : 'text-[#625F59] hover:text-[#141413] hover:bg-[#E8E6DC]/40'
                }`}
              >
                <Trash2 size={14} />
                <span>Trash</span>
              </Link>
            </div>

            {/* Favorites */}
            {favorites.length > 0 && (
              <div>
                <div className="flex items-center space-x-1.5 px-2 py-1 font-semibold text-[#625F59] uppercase tracking-wider text-[10px]">
                  <Star size={11} className="text-[#C15F3C]" />
                  <span>Favorites</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {favorites.map((fav) => renderPageItem(fav, 0))}
                </div>
              </div>
            )}

            {/* Pages Tree */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 font-semibold text-[#625F59] uppercase tracking-wider text-[10px]">
                <span>Pages ({rootPages.length})</span>
                <button
                  type="button"
                  onClick={() => createNewPage()}
                  className="hover:text-[#141413]"
                  title="New top-level page"
                >
                  <Plus size={12} />
                </button>
              </div>

              {rootPages.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[#625F59]">
                  No pages yet. Click &quot;New Document&quot; to begin.
                </div>
              ) : (
                <div className="space-y-0.5 mt-1">
                  {rootPages.map((page) => renderPageItem(page, 0))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* User / Back to OS footer */}
      <div className="p-3 border-t border-[#E8E6DC] flex items-center justify-between text-xs">
        <Link
          href="/app"
          className="text-[#625F59] hover:text-[#141413] flex items-center space-x-1.5"
        >
          <span>&larr; Business OS Home</span>
        </Link>
      </div>
    </aside>
  );
}
