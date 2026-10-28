import { Module } from '@nestjs/common';
import { PlatformConfigModule } from './platform/config/config.module';
import { DatabaseModule } from './platform/database/database.module';
import { OutboxModule } from './platform/outbox/outbox.module';
import { AuditModule } from './platform/audit/audit.module';
import { HealthModule } from './platform/health/health.module';
import { AuthModule } from './platform/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PlatformConfigEndpointsModule } from './modules/platform-config/platform-config.module';
import { SuperAdminModule } from './modules/super-admin/admin.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { SecurityModule } from './platform/security/security.module';
import { RolesTeamsModule } from './modules/roles-teams/roles-teams.module';
import { CatalogCommercialModule } from './modules/catalog-commercial/catalog-commercial.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { WebhooksGovernanceModule } from './modules/webhooks/webhooks-governance.module';

@Module({
  imports: [
    // Core Platform
    PlatformConfigModule,
    DatabaseModule,
    OutboxModule,
    AuditModule,
    HealthModule,
    AuthModule,
    SecurityModule,

    // Domain Modules
    OrganizationsModule,
    CatalogModule,
    EnquiriesModule,
    IdentityModule,
    PlatformConfigEndpointsModule,
    SuperAdminModule,
    DeveloperModule,
    RolesTeamsModule,
    CatalogCommercialModule,
    BillingModule,
    IntegrationsModule,
    MarketplaceModule,
    WebhooksGovernanceModule,
  ],
})
export class AppModule {}
