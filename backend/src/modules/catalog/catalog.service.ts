import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { ProductCategory, ProductStatus, BillingInterval, Prisma } from '@prisma/client';

@Injectable()
export class CatalogService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedCatalogIfEmpty();
  }

  async seedCatalogIfEmpty() {
    const count = await this.prisma.productCatalogPlaceholder.count();
    if (count === 0) {
      await this.prisma.productCatalogPlaceholder.createMany({
        data: [
          {
            code: 'biz-starter',
            name: 'Starter Business OS',
            description: 'Essential core operations, invoicing, client portal, and automated workflows for fast-moving small teams.',
            category: ProductCategory.CORE,
            priceAmount: new Prisma.Decimal(49.00),
            currency: 'USD',
            billingInterval: BillingInterval.MONTHLY,
            status: ProductStatus.ACTIVE,
            features: ['Up to 5 Team Members', 'Core Financial Ledger', 'Client Portal Access', 'Transactional Email Alerts', 'API Access (10k req/mo)'],
          },
          {
            code: 'biz-growth',
            name: 'Growth Suite',
            description: 'Advanced multitenant operating system with granular permissions, developer console, audit logs, and integrations.',
            category: ProductCategory.OPERATIONS,
            priceAmount: new Prisma.Decimal(149.00),
            currency: 'USD',
            billingInterval: BillingInterval.MONTHLY,
            status: ProductStatus.ACTIVE,
            features: ['Up to 25 Team Members', 'Multi-Entity Ledger', 'Developer Console & Webhooks', 'Unlimited Client Portals', 'Full Audit Logging', 'Priority Support'],
          },
          {
            code: 'biz-enterprise',
            name: 'Enterprise Monolith',
            description: 'Dedicated infrastructure, custom SLA, custom data residency, SSO/SAML, and unlimited seat entitlements.',
            category: ProductCategory.CORE,
            priceAmount: new Prisma.Decimal(499.00),
            currency: 'USD',
            billingInterval: BillingInterval.MONTHLY,
            status: ProductStatus.ACTIVE,
            features: ['Unlimited Members & Workspaces', 'Custom Data Retention Policies', 'Dedicated Account Manager', '24/7 Phone & Slack SLA', 'Custom Integrations & Migration Support'],
          },
        ],
      });
    }
  }

  async getActiveProducts() {
    return this.prisma.productCatalogPlaceholder.findMany({
      where: { status: ProductStatus.ACTIVE },
      orderBy: { priceAmount: 'asc' },
    });
  }

  async getPricingPlans() {
    return this.getActiveProducts();
  }
}
