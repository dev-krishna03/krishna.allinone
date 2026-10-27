# Phase 1.1 — Platform Architecture, Monorepo, Public Website and UI Foundation

## Executive Summary
Phase 1.1 establishes the foundational monorepo, NestJS modular monolith, PostgreSQL with Prisma schema & migrations, durable Transactional Outbox, Claude-inspired warm earthy theme token architecture, and 5 discrete Next.js frontend applications.

- **GitHub Repository**: [dev-krishna03/krishna.allinone](https://github.com/dev-krishna03/krishna.allinone)
- **Pull Request #1**: Merged cleanly into `main` ([PR #1](https://github.com/dev-krishna03/krishna.allinone/pull/1))

---

## 1. Monorepo Workspaces Layout
```
krishna.allinone/
├── backend/                               # NestJS Modular Monolith
│   ├── prisma/schema.prisma               # Canonical PostgreSQL Schema
│   ├── src/platform/                      # Core platform foundations
│   │   ├── config/                        # Environment & platform settings
│   │   ├── database/                      # Prisma pooling & lifecycle
│   │   ├── logger/                        # Structured sanitized logger
│   │   ├── outbox/                        # Transactional Outbox publisher & processor
│   │   ├── audit/                         # Immutable audit trail
│   │   └── health/                        # Health telemetry (/api/v1/health)
│   ├── src/modules/                       # Domain feature modules
│   │   ├── catalog/                       # Dynamic pricing & product catalog
│   │   ├── enquiries/                     # Marketing demo requests & lead capture
│   │   ├── identity/                      # Multi-tenant bootstrap (/api/v1/me)
│   │   ├── super-admin/                   # Privacy-safe operational telemetry
│   │   └── developer/                     # Diagnostics & API key management
│   └── test/app.e2e-spec.ts               # End-to-End REST test suite
├── frontend/
│   ├── packages/
│   │   ├── design-tokens/                 # Claude warm earthy tokens & Tailwind preset
│   │   ├── types/                         # Shared TypeScript domain contracts & DTOs
│   │   ├── api-client/                    # Typed API client library
│   │   └── ui/                            # Accessible Tailwind component library
│   └── apps/
│       ├── marketing/                     # Public web & lead capture (Port 3000)
│       ├── business-os/                   # Customer dashboard & launcher (Port 3002)
│       ├── super-admin/                   # SaaS Super Admin Console (Port 3003)
│       ├── developer-panel/               # Developer diagnostics (Port 3004)
│       └── client-portal/                 # External Client Portal (Port 3005)
└── package.json                           # Root monorepo workspace configuration
```

---

## 2. Color Palette Verification
The design token system in `@business-os/design-tokens` implements the Claude-inspired warm earthy palette:

| Token | Hex Value | Role / Usage |
|---|---|---|
| `--color-background` | `#FAF9F5` | Page body background |
| `--color-sidebar` | `#F4F3EE` | Application shell sidebar & card subtle fills |
| `--color-surface` | `#FFFFFF` | Primary card surfaces & form inputs |
| `--color-primary` | `#C15F3C` | Primary terracotta brand accent & buttons |
| `--color-primary-action` | `#B65333` | Button active / press states |
| `--color-hover` | `#A84E31` | Button hover states |
| `--color-accent` | `#D97757` | Secondary accents & focus rings |
| `--color-text` | `#141413` | High-contrast dark typography |
| `--color-text-secondary` | `#625F59` | Subdued paragraph and label typography |
| `--color-border` | `#E8E6DC` | Structural card borders and dividers |
| `--color-success` | `#476B3C` | Operational status & healthy metrics |
| `--color-info` | `#2F5C83` | Informational badges & category tags |
| `--color-warning` | `#996000` | Warning banners & pending status |
| `--color-danger` | `#B42318` | Error alerts & critical indicators |

---

## 3. Canonical PostgreSQL Entities (Prisma)
- **`organizations`**: Tenant boundary bootstrap model with `planTier` (`STARTER`, `GROWTH`, `ENTERPRISE`).
- **`users`**: Tenant membership with role-based scoping (`OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE`, `READ_ONLY`).
- **`marketing_enquiries`**: Unauthenticated marketing lead capture, strictly disjoint from customer CRM accounts.
- **`platform_event_outbox`**: Durable Transactional Outbox pattern with retry counters, failure tracing, and idempotent batch processing.
- **`audit_log`**: Immutable audit records capturing actor, action, entity type, and client IP.
- **`product_catalog_placeholder`**: Dynamic pricing with Prisma `Decimal` monetary precision (`price_amount`).
- **`api_clients`**: Developer console API credentials with granular permission scopes.
- **`support_requests`**: Support tracking per tenant.

---

## 4. REST API Endpoints Implemented (/api/v1)
- `GET /api/v1/health` — Checks database, Redis, and pending outbox queue depth.
- `GET /api/v1/public/products` — Dynamic active catalog items.
- `GET /api/v1/public/pricing` — Published pricing tiers with feature breakdowns.
- `POST /api/v1/public/demo-requests` — Captures leads, writes outbox `marketing.enquiry.created` event, records audit log.
- `GET /api/v1/platform/config` — Runtime multi-tenant feature flags.
- `GET /api/v1/me` — Multi-tenant organization and user context.
- `GET /api/v1/admin/overview` — Privacy-safe aggregate operational stats for SaaS Super Admin.
- `GET /api/v1/developer/diagnostics` — Runtime telemetry and outbox queue inspector.
- `POST /api/v1/developer/outbox/process` — Trigger manual outbox event replay cycle.
- `GET /api/docs` — Interactive OpenAPI Swagger documentation.

---

## 5. Test Suite & Verification Results
- **Unit Tests**:
  - `src/platform/logger/app-logger.service.spec.ts` (PASS: Sensitive field redaction)
  - `src/platform/outbox/outbox.service.spec.ts` (PASS: Event publication & state transitions)
  - `src/modules/enquiries/enquiries.service.spec.ts` (PASS: Enquiry persistence & outbox event dispatch)
  - `src/modules/super-admin/admin.service.spec.ts` (PASS: Aggregate privacy-safe metrics)
  - **Result: 4 suites passed, 8 tests passed.**
- **Integration / E2E Tests**:
  - `backend/test/app.e2e-spec.ts`
  - **Result: 1 suite passed, 9 tests passed.**
- **Production Builds**:
  - `@business-os/design-tokens`: Compiled (0 errors)
  - `@business-os/types`: Compiled (0 errors)
  - `@business-os/api-client`: Compiled (0 errors)
  - `@business-os/ui`: Compiled (0 errors)
  - `@business-os/marketing`: Static build generated (0 errors)
  - `@business-os/app`: Static build generated (0 errors)
  - `@business-os/super-admin`: Static build generated (0 errors)
  - `@business-os/developer-panel`: Static build generated (0 errors)
  - `@business-os/client-portal`: Static build generated (0 errors)
  - `@business-os/backend`: Compiled (0 errors)
