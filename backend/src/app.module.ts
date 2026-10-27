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

@Module({
  imports: [
    // Core Platform
    PlatformConfigModule,
    DatabaseModule,
    OutboxModule,
    AuditModule,
    HealthModule,
    AuthModule,

    // Domain Modules
    OrganizationsModule,
    CatalogModule,
    EnquiriesModule,
    IdentityModule,
    PlatformConfigEndpointsModule,
    SuperAdminModule,
    DeveloperModule,
  ],
})
export class AppModule {}
