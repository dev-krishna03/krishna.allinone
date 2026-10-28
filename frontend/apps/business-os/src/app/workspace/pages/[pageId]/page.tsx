'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { WorkspaceSidebar } from '../../workspace-sidebar';
import {
  FileText,
  Star,
  Share2,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle,
  Copy,
  ChevronRight,
  Globe,
  Lock,
  ArrowLeft,
  Users,
  Send,
  CornerDownRight,
  Sparkles,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import {
  WsPage,
  WsPageBlock,
  WsPageRevision,
  WsPageComment,
  WsPagePermission,
  BlockType,
} from '@business-os/types';

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;

  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<WsPage | null>(null);
  const [allPages, setAllPages] = React.useState<WsPage[]>([]);
  const [blocks, setBlocks] = React.useState<WsPageBlock[]>([]);
  const [comments, setComments] = React.useState<WsPageComment[]>([]);
  const [revisions, setRevisions] = React.useState<WsPageRevision[]>([]);
  const [permissions, setPermissions] = React.useState<WsPagePermission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Drawers and Modals
  const [showCommentsDrawer, setShowCommentsDrawer] = React.useState(false);
  const [showRevisionsDrawer, setShowRevisionsDrawer] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);

  // Editor states
  const [title, setTitle] = React.useState('');
  const [newCommentText, setNewCommentText] = React.useState('');
  const [activeBlockCommentId, setActiveBlockCommentId] = React.useState<string | null>(null);
  const [checkpointDesc, setCheckpointDesc] = React.useState('');
  const [targetMoveParentId, setTargetMoveParentId] = React.useState<string | null>(null);
  const [shareEmail, setShareEmail] = React.useState('');
  const [shareRole, setShareRole] = React.useState<'EDITOR' | 'COMMENTER' | 'VIEWER'>('EDITOR');
  const [collabRoomStatus, setCollabRoomStatus] = React.useState<'connected' | 'syncing' | 'offline'>('connected');

  // Load Page Data
  const loadPageData = React.useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      const [pageRes, blocksRes, commentsRes, revsRes, permsRes, allPagesRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages/${pageId}`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages/${pageId}/blocks`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages/${pageId}/comments`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages/${pageId}/versions`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages/${pageId}/share`, {
          headers: { 'x-organization-id': tenantId },
        }),
        fetch(`http://localhost:3001/api/v1/organizations/${tenantId}/workspace/pages`, {
          headers: { 'x-organization-id': tenantId },
        }),
      ]);

      if (!pageRes.ok) throw new Error('Page not found or access denied');

      const pageData = await pageRes.json();
      setPage(pageData);
      setTitle(pageData.title);

      if (blocksRes.ok) setBlocks(await blocksRes.json());
      if (commentsRes.ok) setComments(await commentsRes.json());
      if (revsRes.ok) setRevisions(await revsRes.json());
      if (permsRes.ok) setPermissions(await permsRes.json());
      if (allPagesRes.ok) setAllPages(await allPagesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  React.useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('http://localhost:3001/api/v1/me');
        if (meRes.ok) {
          const userContext = await meRes.json();
          if (userContext?.organization?.id) {
            setOrgId(userContext.organization.id);
            await loadPageData(userContext.organization.id);
          }
        }
      } catch (err) {
        console.error('Failed to init editor', err);
      }
    }
    init();
  }, [loadPageData]);

  // Save Title
  const handleTitleBlur = async () => {
    if (!orgId || !page || title === page.title) return;
    try {
      setSaving(true);
      await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ title }),
      });
      setPage((prev) => (prev ? { ...prev, title } : null));
    } catch (err) {
      console.error('Failed to save title', err);
    } finally {
      setSaving(false);
    }
  };

  // Block Operations
  const handleAddBlock = async (blockType: BlockType, orderIndex?: number) => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({
          blockType,
          orderIndex,
          content: { text: '' },
        }),
      });
      if (res.ok) {
        const newBlock = await res.json();
        setBlocks((prev) => [...prev, newBlock]);
      }
    } catch (err) {
      console.error('Failed to create block', err);
    }
  };

  const handleUpdateBlockText = async (blockId: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content: { ...b.content, text } } : b)),
    );

    if (!orgId) return;
    try {
      await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ content: { text } }),
      });
    } catch (err) {
      console.error('Failed to update block', err);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!orgId) return;
    try {
      await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks/${blockId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': orgId },
      });
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err) {
      console.error('Failed to delete block', err);
    }
  };

  // Comments
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !newCommentText.trim()) return;

    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({
          content: newCommentText,
          blockId: activeBlockCommentId,
        }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewCommentText('');
        setActiveBlockCommentId(null);
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleResolveComment = async (commentId: string, currentResolved: boolean) => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ isResolved: !currentResolved }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      }
    } catch (err) {
      console.error('Failed to resolve comment', err);
    }
  };

  // Revisions
  const handleCreateCheckpoint = async () => {
    if (!orgId || !checkpointDesc.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ description: checkpointDesc, isNamed: true }),
      });
      if (res.ok) {
        const rev = await res.json();
        setRevisions((prev) => [rev, ...prev]);
        setCheckpointDesc('');
      }
    } catch (err) {
      console.error('Failed to create checkpoint', err);
    }
  };

  const handleRevertVersion = async (version: number) => {
    if (!orgId) return;
    if (!confirm(`Revert document back to version ${version}? Current content will be saved as a new version.`)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ version }),
      });
      if (res.ok) {
        await loadPageData(orgId);
        setShowRevisionsDrawer(false);
      }
    } catch (err) {
      console.error('Failed to revert version', err);
    }
  };

  // Publishing
  const handleTogglePublish = async () => {
    if (!orgId || !page) return;
    const nextPublished = !page.isPublished;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ isPublished: nextPublished }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPage(updated);
      }
    } catch (err) {
      console.error('Failed to toggle publishing', err);
    }
  };

  // Move Page
  const handleMovePage = async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${pageId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({ targetParentId: targetMoveParentId }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.message || 'Cannot move page');
        return;
      }

      await loadPageData(orgId);
      setShowMoveModal(false);
    } catch (err) {
      console.error('Failed to move page', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5] text-xs text-[#625F59]">
        Loading document workspace...
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="bg-white p-8 rounded-xl border border-[#E8E6DC] text-center max-w-md space-y-4">
          <AlertCircle size={36} className="mx-auto text-[#B42318]" />
          <h2 className="text-base font-semibold text-[#141413]">Document Unavailable</h2>
          <p className="text-xs text-[#625F59]">{error || 'This page does not exist or you do not have permission.'}</p>
          <Link
            href="/workspace"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] text-white hover:bg-[#B65333]"
          >
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAF9F5]">
      {orgId && (
        <WorkspaceSidebar
          orgId={orgId}
          pages={allPages}
          onPageCreated={() => orgId && loadPageData(orgId)}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 px-6 border-b border-[#E8E6DC] bg-white flex items-center justify-between z-10 select-none">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 text-xs text-[#625F59] truncate max-w-md">
            <Link href="/workspace" className="hover:text-[#141413]">
              Workspace
            </Link>
            <ChevronRight size={13} />
            {page.parent && (
              <>
                <Link href={`/workspace/pages/${page.parent.id}`} className="hover:text-[#141413] truncate">
                  {page.parent.title}
                </Link>
                <ChevronRight size={13} />
              </>
            )}
            <span className="font-semibold text-[#141413] truncate">{page.title}</span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2.5 text-xs">
            {/* Live Collab Pill */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#476B3C]/10 text-[#476B3C] font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#476B3C] animate-pulse" />
              <span>Live Room</span>
            </div>

            {/* Checkpoints */}
            <button
              type="button"
              onClick={() => setShowRevisionsDrawer(true)}
              className="p-1.5 text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE] rounded-lg transition-colors flex items-center space-x-1"
              title="Version Checkpoints"
            >
              <Clock size={15} />
              <span className="hidden sm:inline font-mono text-[11px]">v{page.currentVersion}</span>
            </button>

            {/* Comments */}
            <button
              type="button"
              onClick={() => setShowCommentsDrawer(true)}
              className="p-1.5 text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE] rounded-lg transition-colors relative"
              title="Discussions"
            >
              <MessageSquare size={15} />
              {comments.filter((c) => !c.isResolved).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C15F3C] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {comments.filter((c) => !c.isResolved).length}
                </span>
              )}
            </button>

            {/* Move Page */}
            <button
              type="button"
              onClick={() => setShowMoveModal(true)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E8E6DC] text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE] transition-colors"
            >
              Move
            </button>

            {/* Share / Publish */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white font-medium shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* Editor Main Canvas */}
        <main className="flex-1 overflow-y-auto px-4 py-10 md:px-16">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Page Title */}
            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Untitled"
                className="w-full text-3xl font-extrabold text-[#141413] placeholder-[#625F59]/50 bg-transparent border-none focus:outline-none"
              />
              <div className="flex items-center space-x-2 text-xs text-[#625F59]">
                <span>Last updated {new Date(page.updatedAt).toLocaleTimeString()}</span>
                {saving && <span className="text-[#C15F3C]">• Saving changes...</span>}
              </div>
            </div>

            {/* Blocks Container */}
            <div className="space-y-3 pt-4">
              {blocks.map((block, idx) => (
                <div key={block.id} className="group relative flex items-start space-x-2">
                  {/* Left Block Controls */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pt-1 -ml-10 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleAddBlock('PARAGRAPH', idx + 1)}
                      className="p-1 text-[#625F59] hover:text-[#141413] rounded hover:bg-[#E8E6DC]"
                      title="Insert block below"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBlockCommentId(block.id);
                        setShowCommentsDrawer(true);
                      }}
                      className="p-1 text-[#625F59] hover:text-[#C15F3C] rounded hover:bg-[#E8E6DC]"
                      title="Comment on block"
                    >
                      <MessageSquare size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1 text-[#625F59] hover:text-[#B42318] rounded hover:bg-[#E8E6DC]"
                      title="Delete block"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Block Content Renderers */}
                  <div className="flex-1 min-w-0">
                    {block.blockType === 'HEADING_1' ? (
                      <input
                        type="text"
                        value={block.content?.text || ''}
                        onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                        placeholder="Heading 1"
                        className="w-full text-2xl font-bold text-[#141413] bg-transparent border-none focus:outline-none"
                      />
                    ) : block.blockType === 'HEADING_2' ? (
                      <input
                        type="text"
                        value={block.content?.text || ''}
                        onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                        placeholder="Heading 2"
                        className="w-full text-xl font-bold text-[#141413] bg-transparent border-none focus:outline-none"
                      />
                    ) : block.blockType === 'QUOTE' ? (
                      <div className="border-l-4 border-[#C15F3C] pl-4 italic text-[#625F59]">
                        <input
                          type="text"
                          value={block.content?.text || ''}
                          onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                          placeholder="Empty quote"
                          className="w-full bg-transparent border-none focus:outline-none italic"
                        />
                      </div>
                    ) : block.blockType === 'CODE' ? (
                      <div className="bg-[#141413] text-[#FAF9F5] p-3 rounded-lg font-mono text-xs">
                        <textarea
                          value={block.content?.text || ''}
                          onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                          placeholder="// Type code here..."
                          rows={3}
                          className="w-full bg-transparent border-none focus:outline-none font-mono text-xs resize-none"
                        />
                      </div>
                    ) : block.blockType === 'CALLOUT' ? (
                      <div className="bg-[#F4F3EE] border border-[#E8E6DC] p-3 rounded-lg flex items-start space-x-2.5">
                        <Sparkles size={16} className="text-[#C15F3C] shrink-0 mt-0.5" />
                        <input
                          type="text"
                          value={block.content?.text || ''}
                          onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                          placeholder="Highlight an insight or critical instruction..."
                          className="w-full bg-transparent border-none focus:outline-none text-xs text-[#141413]"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={block.content?.text || ''}
                        onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                        placeholder="Write something, or press '+' to insert blocks..."
                        rows={1}
                        className="w-full text-sm leading-relaxed text-[#141413] placeholder-[#625F59]/50 bg-transparent border-none focus:outline-none resize-none"
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Bottom Quick Block Inserter */}
              <div className="pt-6 border-t border-[#E8E6DC]/40 flex items-center space-x-2 text-xs">
                <span className="text-[#625F59]">Insert block:</span>
                <button
                  type="button"
                  onClick={() => handleAddBlock('PARAGRAPH')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('HEADING_1')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('HEADING_2')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('CODE')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('CALLOUT')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Callout
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBlock('QUOTE')}
                  className="px-2.5 py-1 rounded border border-[#E8E6DC] hover:bg-[#F4F3EE] text-[#141413]"
                >
                  Quote
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* COMMENTS DRAWER */}
      {showCommentsDrawer && (
        <aside className="w-80 border-l border-[#E8E6DC] bg-white h-screen flex flex-col z-20 shadow-lg">
          <div className="p-4 border-b border-[#E8E6DC] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare size={16} className="text-[#C15F3C]" />
              <h3 className="font-semibold text-sm text-[#141413]">Document Comments</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCommentsDrawer(false)}
              className="text-[#625F59] hover:text-[#141413] text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="p-4 border-b border-[#E8E6DC] space-y-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Leave a comment or mention @member..."
              rows={2}
              className="w-full text-xs p-2.5 border border-[#E8E6DC] rounded-lg text-[#141413] placeholder-[#625F59] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C15F3C] text-white hover:bg-[#B65333] disabled:opacity-50 flex items-center space-x-1"
              >
                <Send size={12} />
                <span>Send</span>
              </button>
            </div>
          </form>

          {/* Comment Threads */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-[#625F59]">
                No comments yet on this document.
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    comment.isResolved
                      ? 'bg-[#F4F3EE]/50 border-[#E8E6DC] opacity-70'
                      : 'bg-[#FAF9F5] border-[#E8E6DC]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#141413]">
                      {comment.authorName || 'Author'}
                    </span>
                    <span className="text-[10px] text-[#625F59]">
                      {new Date(comment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {comment.highlightText && (
                    <div className="mt-1 text-[11px] text-[#C15F3C] italic border-l-2 border-[#C15F3C] pl-2">
                      &quot;{comment.highlightText}&quot;
                    </div>
                  )}

                  <p className="mt-2 text-[#141413] leading-relaxed">{comment.content}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] border-t border-[#E8E6DC]/60 pt-2">
                    <button
                      type="button"
                      onClick={() => handleResolveComment(comment.id, comment.isResolved)}
                      className={`flex items-center space-x-1 ${
                        comment.isResolved
                          ? 'text-[#625F59] hover:text-[#141413]'
                          : 'text-[#476B3C] font-semibold'
                      }`}
                    >
                      <CheckCircle size={13} />
                      <span>{comment.isResolved ? 'Re-open' : 'Resolve'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* REVISIONS DRAWER */}
      {showRevisionsDrawer && (
        <aside className="w-80 border-l border-[#E8E6DC] bg-white h-screen flex flex-col z-20 shadow-lg">
          <div className="p-4 border-b border-[#E8E6DC] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-[#C15F3C]" />
              <h3 className="font-semibold text-sm text-[#141413]">Version History</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowRevisionsDrawer(false)}
              className="text-[#625F59] hover:text-[#141413] text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Create Named Checkpoint */}
          <div className="p-4 border-b border-[#E8E6DC] space-y-2">
            <input
              type="text"
              value={checkpointDesc}
              onChange={(e) => setCheckpointDesc(e.target.value)}
              placeholder="Named checkpoint description..."
              className="w-full text-xs p-2 border border-[#E8E6DC] rounded-lg text-[#141413] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
            />
            <button
              type="button"
              onClick={handleCreateCheckpoint}
              disabled={!checkpointDesc.trim()}
              className="w-full py-1.5 text-xs font-semibold rounded-lg bg-[#C15F3C] text-white hover:bg-[#B65333] disabled:opacity-50 transition-colors"
            >
              Save Named Checkpoint
            </button>
          </div>

          {/* Revision List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-lg border border-[#E8E6DC] hover:border-[#C15F3C]/50 transition-colors space-y-2 bg-[#FAF9F5]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#C15F3C]">v{rev.version}</span>
                  <span className="text-[10px] text-[#625F59]">
                    {new Date(rev.createdAt).toLocaleDateString()}{' '}
                    {new Date(rev.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <p className="font-medium text-[#141413]">
                  {rev.description || rev.title || 'Autosave checkpoint'}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[#625F59]">{rev.createdByName || 'Member'}</span>
                  {rev.version !== page.currentVersion && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion(rev.version)}
                      className="text-[#C15F3C] hover:underline font-semibold"
                    >
                      Revert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* SHARE / PUBLISH MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DC] max-w-lg w-full p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-4">
              <div className="flex items-center space-x-2">
                <Share2 size={18} className="text-[#C15F3C]" />
                <h3 className="font-bold text-sm text-[#141413]">Share &amp; Publish Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-[#625F59] hover:text-[#141413] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Public Publishing Boundary */}
            <div className="p-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe size={16} className={page.isPublished ? 'text-[#476B3C]' : 'text-[#625F59]'} />
                  <div>
                    <h4 className="font-semibold text-xs text-[#141413]">Public Web Publishing</h4>
                    <p className="text-[11px] text-[#625F59]">
                      Anyone with the public URL can read this document without logging in.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePublish}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    page.isPublished
                      ? 'bg-[#476B3C] text-white hover:bg-[#476B3C]/90'
                      : 'bg-[#E8E6DC] text-[#141413] hover:bg-[#E8E6DC]/80'
                  }`}
                >
                  {page.isPublished ? 'Published' : 'Publish'}
                </button>
              </div>

              {page.isPublished && page.publishedSlug && (
                <div className="pt-2 border-t border-[#E8E6DC]">
                  <div className="text-[11px] font-mono bg-white p-2 rounded border border-[#E8E6DC] flex items-center justify-between truncate">
                    <span className="truncate text-[#2F5C83]">
                      http://localhost:3000/p/{page.publishedSlug}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`http://localhost:3000/p/${page.publishedSlug}`);
                        alert('Copied public URL to clipboard');
                      }}
                      className="text-[#625F59] hover:text-[#141413] shrink-0 ml-2 font-sans"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Access Permissions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-[#141413]">Organization Access Grants</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F4F3EE] text-xs">
                  <span className="font-medium text-[#141413]">Workspace Organization Members</span>
                  <span className="text-[11px] text-[#625F59]">Editor by Default</span>
                </div>
                {permissions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-[#E8E6DC] text-xs"
                  >
                    <div>
                      <div className="font-medium text-[#141413]">
                        {p.userName || p.roleName || p.teamName}
                      </div>
                      <div className="text-[10px] text-[#625F59]">{p.userEmail || 'Role/Team grant'}</div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E6DC]">
                      {p.accessLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E8E6DC]">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] text-white hover:bg-[#B65333]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE MODAL */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DC] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-[#141413]">Move Page in Hierarchy</h3>
            <p className="text-xs text-[#625F59]">
              Select a target parent document. Cycle prevention stops moving into descendants.
            </p>

            <select
              value={targetMoveParentId || ''}
              onChange={(e) => setTargetMoveParentId(e.target.value || null)}
              className="w-full text-xs p-2.5 border border-[#E8E6DC] rounded-lg bg-white text-[#141413] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
            >
              <option value="">(Root - Top Level)</option>
              {allPages
                .filter((p) => p.id !== page.id && !p.isDeleted)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {'- '.repeat(p.depth)} {p.title}
                  </option>
                ))}
            </select>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E8E6DC]">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E6DC] text-[#625F59] hover:bg-[#F4F3EE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMovePage}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#C15F3C] text-white hover:bg-[#B65333]"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
