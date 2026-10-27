# Unified Modular-Monolith Business OS

Extensible multitenant modular-monolith Business OS with separate marketing, customer, client-portal, SaaS Super Admin and Developer Console frontends.

## Architecture

- **Monorepo Structure**:
  - `frontend/apps/marketing` - Public marketing website and acquisition (Next.js)
  - `frontend/apps/business-os` - Unified Business OS Customer App (Next.js)
  - `frontend/apps/super-admin` - SaaS Super Admin Console (Next.js)
  - `frontend/apps/developer-panel` - Developer Console & System Diagnostics (Next.js)
  - `frontend/apps/client-portal` - External Client Portal (Next.js)
  - `frontend/packages/ui` - Reusable Tailwind & Radix-inspired accessible component system
  - `frontend/packages/design-tokens` - Claude-inspired Warm Earthy Palette tokens
  - `frontend/packages/api-client` - Typed HTTP API client
  - `frontend/packages/types` - Shared domain entities, DTOs and contracts
  - `backend/src/platform` - Core platform modules (config, logger, database, outbox, auth, health)
  - `backend/src/modules` - Domain-specific modules (catalog, enquiries, audit, admin)

## Color Palette (Claude-inspired Warm Earthy)

- **Background**: `#FAF9F5`
- **Sidebar**: `#F4F3EE`
- **Surface**: `#FFFFFF`
- **Primary**: `#C15F3C`
- **Primary Action**: `#B65333`
- **Hover**: `#A84E31`
- **Accent**: `#D97757`
- **Text**: `#141413`
- **Secondary Text**: `#625F59`
- **Border**: `#E8E6DC`
- **Success**: `#476B3C`
- **Info**: `#2F5C83`
- **Warning**: `#996000`
- **Danger**: `#B42318`
