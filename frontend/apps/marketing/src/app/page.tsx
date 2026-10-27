import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-24 py-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DC] bg-[#F4F3EE] px-4 py-1.5 text-xs font-semibold text-[#C15F3C]">
          <span>★ Phase 1.1 Architecture & UI Foundation</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#141413] max-w-4xl mx-auto leading-tight">
          One extensible modular-monolith{' '}
          <span className="text-[#C15F3C]">Business Operating System</span>
        </h1>
        <p className="text-lg text-[#625F59] max-w-2xl mx-auto leading-relaxed">
          Unify marketing, customer operations, client portal, SaaS super admin, and developer telemetry into a single high-performance multitenant architecture.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/contact"
            className="rounded-md bg-[#C15F3C] px-6 py-3 text-sm font-medium text-white hover:bg-[#A84E31] transition-all shadow-md"
          >
            Request Enterprise Demo
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-[#E8E6DC] bg-[#FFFFFF] px-6 py-3 text-sm font-medium text-[#141413] hover:bg-[#F4F3EE] transition-all shadow-sm"
          >
            Explore Dynamic Pricing
          </Link>
          <a
            href="http://localhost:3002"
            className="rounded-md bg-[#F4F3EE] border border-[#E8E6DC] px-6 py-3 text-sm font-medium text-[#625F59] hover:text-[#141413] transition-all"
          >
            Launch Business OS →
          </a>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#141413]">
            Engineered for Strict Tenant Isolation & Scale
          </h2>
          <p className="text-sm text-[#625F59] max-w-xl mx-auto">
            Built from first principles with PostgreSQL, Prisma Decimal monetary precision, and durable Transactional Outbox.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-xl border border-[#E8E6DC] bg-[#FFFFFF] p-8 shadow-sm hover:border-[#C15F3C]/40 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[#C15F3C]/10 text-[#C15F3C] flex items-center justify-center font-bold text-lg mb-5">
              ⛃
            </div>
            <h3 className="text-lg font-bold text-[#141413] mb-2">Canonical PostgreSQL Core</h3>
            <p className="text-sm text-[#625F59] leading-relaxed">
              Standalone PostgreSQL with explicit UTC timestamps, schema migrations, strict tenant foreign keys, and Decimal precision.
            </p>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-[#FFFFFF] p-8 shadow-sm hover:border-[#C15F3C]/40 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[#2F5C83]/10 text-[#2F5C83] flex items-center justify-center font-bold text-lg mb-5">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-[#141413] mb-2">Transactional Outbox</h3>
            <p className="text-sm text-[#625F59] leading-relaxed">
              Domain events (<code className="text-xs bg-[#F4F3EE] px-1 py-0.5 rounded">marketing.enquiry.created</code>) are committed transactionally with state, preventing split-brain states.
            </p>
          </div>

          <div className="rounded-xl border border-[#E8E6DC] bg-[#FFFFFF] p-8 shadow-sm hover:border-[#C15F3C]/40 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[#476B3C]/10 text-[#476B3C] flex items-center justify-center font-bold text-lg mb-5">
              🛡
            </div>
            <h3 className="text-lg font-bold text-[#141413] mb-2">Claude Warm Earthy Palette</h3>
            <p className="text-sm text-[#625F59] leading-relaxed">
              Standardized design tokens (#FAF9F5, #C15F3C, #D97757, #141413, #E8E6DC) powering reusable WCAG-compliant UI primitives across all applications.
            </p>
          </div>
        </div>
      </section>

      {/* Applications Catalog Showcase */}
      <section className="max-w-7xl mx-auto px-6 bg-[#F4F3EE] rounded-2xl p-12 border border-[#E8E6DC]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C15F3C]">Multi-Application Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#141413] mt-1">Five Integrated Frontends</h2>
          </div>
          <Link href="/pricing" className="text-sm font-semibold text-[#C15F3C] hover:underline">
            View Commercial Bundles →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-lg bg-white p-5 border border-[#E8E6DC] shadow-sm">
            <span className="text-xs font-semibold text-[#C15F3C]">Public</span>
            <h4 className="font-bold text-sm text-[#141413] mt-1">Marketing Web</h4>
            <p className="text-xs text-[#625F59] mt-2">Acquisition, responsive landing, and lead capture.</p>
          </div>

          <div className="rounded-lg bg-white p-5 border border-[#E8E6DC] shadow-sm">
            <span className="text-xs font-semibold text-[#2F5C83]">Tenant</span>
            <h4 className="font-bold text-sm text-[#141413] mt-1">Business OS Shell</h4>
            <p className="text-xs text-[#625F59] mt-2">Workspace switcher, app launcher, and user onboarding.</p>
          </div>

          <div className="rounded-lg bg-white p-5 border border-[#E8E6DC] shadow-sm">
            <span className="text-xs font-semibold text-[#996000]">External</span>
            <h4 className="font-bold text-sm text-[#141413] mt-1">Client Portal</h4>
            <p className="text-xs text-[#625F59] mt-2">Dedicated workspace for external stakeholders.</p>
          </div>

          <div className="rounded-lg bg-white p-5 border border-[#E8E6DC] shadow-sm">
            <span className="text-xs font-semibold text-[#476B3C]">Operations</span>
            <h4 className="font-bold text-sm text-[#141413] mt-1">SaaS Super Admin</h4>
            <p className="text-xs text-[#625F59] mt-2">Privacy-safe aggregate metrics & tenant management.</p>
          </div>

          <div className="rounded-lg bg-white p-5 border border-[#E8E6DC] shadow-sm">
            <span className="text-xs font-semibold text-[#B42318]">Diagnostics</span>
            <h4 className="font-bold text-sm text-[#141413] mt-1">Developer Console</h4>
            <p className="text-xs text-[#625F59] mt-2">Event outbox replay, API client keys, runtime telemetry.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
