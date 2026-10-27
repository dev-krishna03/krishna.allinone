'use client';

import * as React from 'react';

export default function ClientPortalPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Header */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded bg-[#476B3C] text-white flex items-center justify-center font-bold text-sm">
              CP
            </span>
            <div>
              <h1 className="font-bold text-sm text-[#141413]">Client Portal</h1>
              <p className="text-[11px] text-[#625F59]">External Client Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              className="text-xs text-[#625F59] hover:text-[#C15F3C] font-medium"
            >
              Public Website
            </a>
            <a
              href="http://localhost:3002"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Business OS →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-8 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#476B3C]">
            Client Portal Overview
          </span>
          <h2 className="text-2xl font-bold text-[#141413] mt-1">
            Welcome to Your Dedicated Client Workspace
          </h2>
          <p className="text-sm text-[#625F59] mt-2 max-w-2xl leading-relaxed">
            Review your approved invoices, deliverables, support tickets, and shared project assets in a secure, tenant-isolated external environment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs">
            <div className="text-xs font-medium text-[#625F59]">Outstanding Invoices</div>
            <div className="text-2xl font-bold text-[#141413] mt-2">$0.00</div>
            <span className="text-[11px] text-[#476B3C] font-semibold">All accounts settled</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs">
            <div className="text-xs font-medium text-[#625F59]">Active Milestones</div>
            <div className="text-2xl font-bold text-[#141413] mt-2">4 Delivered</div>
            <span className="text-[11px] text-[#2F5C83] font-semibold">Q4 Sprint in progress</span>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs">
            <div className="text-xs font-medium text-[#625F59]">Support SLA Status</div>
            <div className="text-2xl font-bold text-[#476B3C] mt-2">Active</div>
            <span className="text-[11px] text-[#625F59]">Priority Response Guaranteed</span>
          </div>
        </div>
      </main>
    </div>
  );
}
