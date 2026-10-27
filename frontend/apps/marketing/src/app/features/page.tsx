import Link from 'next/link';

export default function FeaturesPage() {
  const featureList = [
    {
      category: 'Monorepo & Boundaries',
      items: [
        'Isolated applications: marketing, business-os, super-admin, developer-panel, and client-portal',
        'Shared design tokens with strict CSS custom property encapsulation',
        'Strict module boundaries prohibiting server-only dependencies inside browser bundles',
        'Unified TypeScript domain types and contracts (@business-os/types)',
      ],
    },
    {
      category: 'Backend & Data Integrity',
      items: [
        'NestJS modular monolith organized under backend/src/platform and backend/src/modules',
        'Versioned REST API endpoints under /api/v1 with Swagger OpenAPI docs',
        'PostgreSQL with Prisma Decimal precision for monetary amounts',
        'Normalized UTC timestamps across all stored records and audit entries',
      ],
    },
    {
      category: 'Security & Multitenancy',
      items: [
        'Row-level tenant isolation via mandatory organization_id on tenant entities',
        'Strict tenant-consistent foreign keys and cascading delete safeguards',
        'Privacy-safe Super Admin console with aggregate metrics (no tenant record leaks)',
        'Structured logging with automated redaction of sensitive credentials and PII',
      ],
    },
    {
      category: 'Event-Driven Outbox',
      items: [
        'Transactional Outbox pattern ensuring atomicity between database writes and event dispatch',
        'Standard domain events: marketing.enquiry.created, platform.config.changed, platform.job.failed',
        'Idempotent event processing with retry counts and failure capture',
        'Manual developer console replay and health telemetry verification',
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-[#141413]">
          Platform Architecture & Capabilities
        </h1>
        <p className="text-[#625F59] text-base leading-relaxed">
          Every component in the Unified Business OS is engineered to satisfy enterprise reliability, tenant boundaries, and auditability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {featureList.map((section, idx) => (
          <div key={idx} className="rounded-xl border border-[#E8E6DC] bg-white p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#141413] mb-4 pb-2 border-b border-[#E8E6DC] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C15F3C]"></span>
              {section.category}
            </h3>
            <ul className="space-y-3">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-3 text-sm text-[#625F59]">
                  <span className="text-[#476B3C] font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <Link
          href="/contact"
          className="rounded-md bg-[#C15F3C] px-6 py-3 text-sm font-medium text-white hover:bg-[#A84E31] transition-colors shadow-sm"
        >
          Schedule an Architecture Review
        </Link>
      </div>
    </div>
  );
}
