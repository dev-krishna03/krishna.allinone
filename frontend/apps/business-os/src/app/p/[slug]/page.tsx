'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { FileText, Globe, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

interface PublicDoc {
  title: string;
  icon?: string;
  coverUrl?: string;
  contentJson?: Record<string, any>;
  blocks: {
    id: string;
    blockType: string;
    content: Record<string, any>;
  }[];
  updatedAt: string;
}

export default function PublicDocumentPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [doc, setDoc] = React.useState<PublicDoc | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadPublicDoc() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/api/v1/public/pages/${slug}`);
        if (!res.ok) {
          throw new Error('This document is private or does not exist');
        }
        const data = await res.json();
        setDoc(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadPublicDoc();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-xs text-[#625F59]">
        Loading published document...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-[#E8E6DC] text-center max-w-md space-y-4 shadow-sm">
          <AlertCircle size={36} className="mx-auto text-[#625F59]/50" />
          <h2 className="text-base font-semibold text-[#141413]">Document Not Available</h2>
          <p className="text-xs text-[#625F59]">
            {error || 'The page you requested is private or has not been published.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413]">
      {/* Top Banner */}
      <header className="border-b border-[#E8E6DC] bg-white/80 backdrop-blur px-6 py-3 flex items-center justify-between text-xs text-[#625F59]">
        <div className="flex items-center space-x-2">
          <Globe size={14} className="text-[#476B3C]" />
          <span>Published Public Document</span>
        </div>
        <div className="font-mono text-[11px]">
          Last revised {new Date(doc.updatedAt).toLocaleDateString()}
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#141413]">
            {doc.title}
          </h1>
        </div>

        <div className="space-y-4">
          {doc.blocks && doc.blocks.length > 0 ? (
            doc.blocks.map((block) => {
              const text = block.content?.text || '';
              if (block.blockType === 'HEADING_1') {
                return (
                  <h2 key={block.id} className="text-2xl font-bold text-[#141413] pt-4">
                    {text}
                  </h2>
                );
              }
              if (block.blockType === 'HEADING_2') {
                return (
                  <h3 key={block.id} className="text-xl font-semibold text-[#141413] pt-3">
                    {text}
                  </h3>
                );
              }
              if (block.blockType === 'QUOTE') {
                return (
                  <blockquote
                    key={block.id}
                    className="border-l-4 border-[#C15F3C] pl-4 italic text-[#625F59] my-2"
                  >
                    {text}
                  </blockquote>
                );
              }
              if (block.blockType === 'CALLOUT') {
                return (
                  <div
                    key={block.id}
                    className="bg-[#F4F3EE] border border-[#E8E6DC] p-4 rounded-xl flex items-start space-x-3 my-2"
                  >
                    <Sparkles size={18} className="text-[#C15F3C] shrink-0 mt-0.5" />
                    <p className="text-sm text-[#141413] leading-relaxed">{text}</p>
                  </div>
                );
              }
              if (block.blockType === 'CODE') {
                return (
                  <pre
                    key={block.id}
                    className="bg-[#141413] text-[#FAF9F5] p-4 rounded-xl font-mono text-xs overflow-x-auto my-2"
                  >
                    <code>{text}</code>
                  </pre>
                );
              }
              if (block.blockType === 'EMBED' && block.content?.url) {
                return (
                  <div key={block.id} className="my-4 rounded-xl overflow-hidden border border-[#E8E6DC]">
                    <iframe
                      src={block.content.url}
                      className="w-full h-80 border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <p key={block.id} className="text-base leading-relaxed text-[#141413]">
                  {text}
                </p>
              );
            })
          ) : (
            <p className="text-[#625F59] italic text-sm">This document has no content yet.</p>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-12 border-t border-[#E8E6DC] flex items-center justify-between text-xs text-[#625F59]">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-[#C15F3C] text-white flex items-center justify-center font-bold text-[10px]">
              B
            </div>
            <span>Powered by Business OS Workspace</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
