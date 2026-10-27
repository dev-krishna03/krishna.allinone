import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { OutboxModule } from '../../platform/outbox/outbox.module';
import { CatalogCommercialService } from './catalog-commercial.service';
import { EntitlementsService } from './entitlements.service';
import { PublicPricingController } from './public-pricing.controller';
import { PlatformCatalogController } from './platform-catalog.controller';
import { TenantEntitlementsController } from './tenant-entitlements.controller';
import { EntitlementGuard } from './guards/entitlement.guard';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [
    PublicPricingController,
    PlatformCatalogController,
    TenantEntitlementsController,
  ],
  providers: [
    CatalogCommercialService,
    EntitlementsService,
    EntitlementGuard,
  ],
  exports: [
    CatalogCommercialService,
    EntitlementsService,
    EntitlementGuard,
  ],
})
export class CatalogCommercialModule {}
