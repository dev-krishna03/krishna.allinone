'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspaceSidebar } from '../workspace-sidebar';
import {
  LayoutTemplate,
  Plus,
  BookOpen,
  CheckCircle,
  FileText,
  Cpu,
  Users,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import { WsPage } from '@business-os/types';

interface TemplateDef {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  blocks: { type: string; text: string }[];
}

const STARTER_TEMPLATES: TemplateDef[] = [
  {
    id: 'prd',
    title: 'Product Requirement Document (PRD)',
    category: 'Engineering & Product',
    icon: 'Cpu',
    description: 'Structure problem statements, user personas, functional specs, milestones and acceptance criteria.',
    blocks: [
      { type: 'HEADING_1', text: 'Problem Statement & Opportunity' },
      { type: 'PARAGRAPH', text: 'Describe the core user pain point and quantitative metrics to validate success.' },
      { type: 'HEADING_2', text: 'Target Personas & User Stories' },
      { type: 'PARAGRAPH', text: 'As a workspace administrator, I want to manage page permissions centrally.' },
      { type: 'HEADING_2', text: 'Non-Functional & Security Requirements' },
      { type: 'CALLOUT', text: 'Tenancy isolation: All queries MUST enforce organization_id and deny-by-default.' },
    ],
  },
  {
    id: 'weekly-sync',
    title: 'Weekly Team Sync & Sprint Notes',
    category: 'Operations & Team',
    icon: 'Users',
    description: 'Keep team updates, cross-functional blockers, agenda items and action items organized.',
    blocks: [
      { type: 'HEADING_1', text: 'Agenda & Round Robin' },
      { type: 'PARAGRAPH', text: 'Key highlights and customer feedback from the past week.' },
      { type: 'HEADING_2', text: 'Blockers & Risk Register' },
      { type: 'PARAGRAPH', text: 'List any dependencies pending third-party approvals or compliance audit.' },
      { type: 'HEADING_2', text: 'Action Items & Owners' },
      { type: 'PARAGRAPH', text: '[ ] Deploy Phase 2.1 to staging environment (Owner: Team Lead)' },
    ],
  },
  {
    id: 'adr',
    title: 'Architecture Decision Record (ADR)',
    category: 'Engineering & Product',
    icon: 'Cpu',
    description: 'Document architectural choices, tradeoffs, alternatives considered, and implementation consequences.',
    blocks: [
      { type: 'HEADING_1', text: 'Status: Proposed / Accepted / Deprecated' },
      { type: 'PARAGRAPH', text: 'Date: ' + new Date().toISOString().slice(0, 10) },
      { type: 'HEADING_2', text: 'Context & Decision Drivers' },
      { type: 'PARAGRAPH', text: 'Need a collision-free CRDT synchronization engine for rich-text page edits.' },
      { type: 'HEADING_2', text: 'Decision Outcome' },
      { type: 'CALLOUT', text: 'Adopt Yjs with Hocuspocus CRDT state vectors and PostgreSQL snapshot checkpoints.' },
    ],
  },
  {
    id: 'customer-playbook',
    title: 'Customer Onboarding Playbook',
    category: 'Customer Success',
    icon: 'Compass',
    description: 'Guided milestones from initial tenant provisioning to enterprise seat adoption and review.',
    blocks: [
      { type: 'HEADING_1', text: 'Phase 1: Welcome & Domain Setup' },
      { type: 'PARAGRAPH', text: 'Configure custom domains, invite organization administrators, and assign seats.' },
      { type: 'HEADING_2', text: 'Phase 2: Data Migration & Integrations' },
      { type: 'PARAGRAPH', text: 'Connect Slack notifications, OAuth storage connectors and webhook subscriptions.' },
    ],
  },
];

export default function WorkspaceTemplatesPage() {
  const router = useRouter();
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [allPages, setAllPages] = React.useState<WsPage[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [instantiating, setInstantiating] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadIdentity() {
      try {
        const res = await fetch('http://localhost:3001/api/v1/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.organization?.id) {
            setOrgId(json.organization.id);
            const pagesRes = await fetch(
              `http://localhost:3001/api/v1/organizations/${json.organization.id}/workspace/pages`,
              { headers: { 'x-organization-id': json.organization.id } },
            );
            if (pagesRes.ok) setAllPages(await pagesRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to load identity', err);
      }
    }
    loadIdentity();
  }, []);

  const handleUseTemplate = async (template: TemplateDef) => {
    if (!orgId || instantiating) return;
    setInstantiating(template.id);

    try {
      // 1. Create page
      const pageRes = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({
          title: template.title,
          icon: template.icon,
        }),
      });

      if (!pageRes.ok) throw new Error('Failed to create page from template');
      const newPage = await pageRes.json();

      // 2. Insert template blocks
      for (let i = 0; i < template.blocks.length; i++) {
        await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/workspace/pages/${newPage.id}/blocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
          },
          body: JSON.stringify({
            blockType: template.blocks[i].type,
            content: { text: template.blocks[i].text },
            orderIndex: i + 1,
          }),
        });
      }

      router.push(`/workspace/pages/${newPage.id}`);
    } catch (err) {
      console.error('Error instantiating template', err);
      setInstantiating(null);
    }
  };

  const categories = ['All', 'Engineering & Product', 'Operations & Team', 'Customer Success'];

  const filteredTemplates =
    selectedCategory === 'All'
      ? STARTER_TEMPLATES
      : STARTER_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="flex min-h-screen bg-[#FAF9F5]">
      {orgId && (
        <WorkspaceSidebar
          orgId={orgId}
          pages={allPages}
        />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-8 py-6 border-b border-[#E8E6DC] bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#141413] flex items-center space-x-2">
              <LayoutTemplate size={20} className="text-[#C15F3C]" />
              <span>Document Templates</span>
            </h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Launch pre-structured documents, meeting cadences, specs, and playbooks in one click.
            </p>
          </div>

          <Link
            href="/workspace"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#E8E6DC] text-[#141413] hover:bg-[#F4F3EE] flex items-center space-x-1.5"
          >
            <ArrowLeft size={13} />
            <span>Workspace</span>
          </Link>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Category Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C15F3C] text-white'
                    : 'bg-white border border-[#E8E6DC] text-[#625F59] hover:text-[#141413]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-[#E8E6DC] p-6 shadow-sm flex flex-col justify-between hover:border-[#C15F3C]/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F3EE] text-[#625F59]">
                      {template.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#141413] flex items-center space-x-2">
                    <FileText size={16} className="text-[#C15F3C]" />
                    <span>{template.title}</span>
                  </h3>

                  <p className="text-xs text-[#625F59] leading-relaxed">
                    {template.description}
                  </p>

                  <div className="pt-2 border-t border-[#E8E6DC]/60 space-y-1">
                    <div className="text-[10px] font-semibold text-[#625F59] uppercase tracking-wider">
                      Included sections:
                    </div>
                    {template.blocks.map((b, i) => (
                      <div key={i} className="text-[11px] text-[#625F59] truncate flex items-center space-x-1.5">
                        <span className="text-[#C15F3C]">•</span>
                        <span className="truncate">{b.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template)}
                    disabled={instantiating === template.id}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-[#C15F3C] hover:bg-[#B65333] text-white shadow-sm flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>
                      {instantiating === template.id ? 'Creating Document...' : 'Use Template'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
