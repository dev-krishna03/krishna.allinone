import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import {
  SaaSProductStatus,
  ProductCategory,
  PlanEdition,
  BillingInterval,
  PlanPublishStatus,
  FeatureType,
} from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateFeatureDto,
  CreatePlanDto,
  CreateBundleDto,
} from '@business-os/types';

export const STANDARD_MODULES = [
  {
    slug: 'workspace',
    name: 'Workspace Core OS',
    description: 'Central dashboard, unified member directory, settings, audit trails and notification engine.',
    icon: 'Layers',
    category: ProductCategory.CORE,
    dependencies: [],
  },
  {
    slug: 'crm',
    name: 'Customer Relationship Management',
    description: 'Deals pipeline, accounts, contact activity timelines and customer lifecycle tracking.',
    icon: 'Users',
    category: ProductCategory.GROWTH,
    dependencies: ['workspace'],
  },
  {
    slug: 'projects',
    name: 'Project & Task Management',
    description: 'Kanban boards, Gantt charts, milestones, sprint boards and issue tracking.',
    icon: 'CheckSquare',
    category: ProductCategory.OPERATIONS,
    dependencies: ['workspace'],
  },
  {
    slug: 'hrms',
    name: 'Human Resource Management',
    description: 'Employee lifecycle, time off requests, payroll integration, org chart and onboarding.',
    icon: 'Briefcase',
    category: ProductCategory.OPERATIONS,
    dependencies: ['workspace'],
  },
  {
    slug: 'chat',
    name: 'Real-time Team Messaging',
    description: 'Direct messages, channels, voice huddles, document sharing and rich emoji reactions.',
    icon: 'MessageSquare',
    category: ProductCategory.CORE,
    dependencies: ['workspace'],
  },
  {
    slug: 'calendar',
    name: 'Shared Team Calendaring',
    description: 'Event scheduling, resource bookings, multi-timezone planning and ICS synchronization.',
    icon: 'Calendar',
    category: ProductCategory.CORE,
    dependencies: ['workspace'],
  },
  {
    slug: 'finance',
    name: 'Invoicing & Financial Ledger',
    description: 'Double-entry accounting, customer billing, vendor payouts, VAT/tax handling and statements.',
    icon: 'DollarSign',
    category: ProductCategory.FINANCE,
    dependencies: ['workspace'],
  },
  {
    slug: 'files',
    name: 'Cloud Drive & Secure Document Storage',
    description: 'Asset libraries, versioned document previews, folder permissions and access grants.',
    icon: 'Folder',
    category: ProductCategory.OPERATIONS,
    dependencies: ['workspace'],
  },
  {
    slug: 'forms',
    name: 'Workflow Form Builder',
    description: 'Drag-and-drop form designer, survey responses, public embed and automated routing.',
    icon: 'FileText',
    category: ProductCategory.GROWTH,
    dependencies: ['workspace'],
  },
  {
    slug: 'helpdesk',
    name: 'Customer Support & Ticketing',
    description: 'Omnichannel ticket queue, SLA monitoring, agent assignment and canned responses.',
    icon: 'LifeBuoy',
    category: ProductCategory.OPERATIONS,
    dependencies: ['workspace'],
  },
  {
    slug: 'automation',
    name: 'Workflow Automation & Triggers',
    description: 'Multi-step triggers, background schedules, webhook transforms and automated actions.',
    icon: 'Zap',
    category: ProductCategory.OPERATIONS,
    dependencies: ['workspace'],
  },
  {
    slug: 'analytics',
    name: 'Business Intelligence & Dashboards',
    description: 'Custom KPIs, real-time charts, executive rollups and scheduled PDF report delivery.',
    icon: 'BarChart2',
    category: ProductCategory.GROWTH,
    dependencies: ['workspace'],
  },
  {
    slug: 'builder',
    name: 'Low-Code App & View Builder',
    description: 'Custom data tables, relational form views, custom dashboards and portal branding.',
    icon: 'Code',
    category: ProductCategory.GROWTH,
    dependencies: ['workspace'],
  },
  {
    slug: 'developer',
    name: 'Developer Console & API Tokens',
    description: 'REST API keys, webhook subscribers, OpenAPI explorer and diagnostic audit tracing.',
    icon: 'Terminal',
    category: ProductCategory.CORE,
    dependencies: ['workspace'],
  },
];

@Injectable()
export class CatalogCommercialService implements OnModuleInit {
  private readonly logger = new Logger(CatalogCommercialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async onModuleInit() {
    await this.seedStandardCatalog();
  }

  async seedStandardCatalog() {
    try {
      // 1. Seed 14 Standard Modules
      for (const mod of STANDARD_MODULES) {
        await this.prisma.saaSProduct.upsert({
          where: { slug: mod.slug },
          create: {
            slug: mod.slug,
            name: mod.name,
            description: mod.description,
            icon: mod.icon,
            category: mod.category,
            status: SaaSProductStatus.ACTIVE,
            dependencies: mod.dependencies,
          },
          update: {
            name: mod.name,
            description: mod.description,
            icon: mod.icon,
            category: mod.category,
            dependencies: mod.dependencies,
          },
        });
      }

      // 2. Seed Default Plans for Workspace Core OS and CRM
      const workspaceProd = await this.prisma.saaSProduct.findUnique({
        where: { slug: 'workspace' },
      });
      const crmProd = await this.prisma.saaSProduct.findUnique({
        where: { slug: 'crm' },
      });

      if (workspaceProd) {
        // Core Community Plan
        const coreCommunity = await this.prisma.saaSPlan.upsert({
          where: { code: 'core_community_free' },
          create: {
            productId: workspaceProd.id,
            name: 'Workspace Community Free',
            code: 'core_community_free',
            edition: PlanEdition.COMMUNITY,
            billingInterval: BillingInterval.MONTHLY,
            status: PlanPublishStatus.PUBLISHED,
            includedSeats: 5,
            trialDays: 0,
          },
          update: { status: PlanPublishStatus.PUBLISHED },
        });

        try {
          await this.prisma.saaSPlanVersion.upsert({
            where: { planId_version: { planId: coreCommunity.id, version: 1 } },
            create: {
              planId: coreCommunity.id,
              version: 1,
              priceAmount: 0.0,
              currency: 'USD',
              featureLimits: { storageGB: 5, apiRateLimitMin: 60 },
            },
            update: {},
          });
        } catch (_) {}
      }

      if (crmProd) {
        // CRM Pro Plan
        const crmPro = await this.prisma.saaSPlan.upsert({
          where: { code: 'crm_growth_monthly' },
          create: {
            productId: crmProd.id,
            name: 'CRM Growth Edition',
            code: 'crm_growth_monthly',
            edition: PlanEdition.GROWTH,
            billingInterval: BillingInterval.MONTHLY,
            status: PlanPublishStatus.PUBLISHED,
            includedSeats: 10,
            trialDays: 14,
          },
          update: { status: PlanPublishStatus.PUBLISHED },
        });

        try {
          await this.prisma.saaSPlanVersion.upsert({
            where: { planId_version: { planId: crmPro.id, version: 1 } },
            create: {
              planId: crmPro.id,
              version: 1,
              priceAmount: 49.0,
              currency: 'USD',
              featureLimits: { maxDeals: 10000, pipelineCustomStages: 20 },
            },
            update: {},
          });
        } catch (_) {}
      }

      // 3. Seed "Full Suite" Bundle
      const fullSuiteBundle = await this.prisma.saaSBundle.upsert({
        where: { code: 'full_suite_business_os' },
        create: {
          code: 'full_suite_business_os',
          name: 'Unified Business OS — Full Suite',
          description: 'Complete integrated platform unlocking all 14 commercial applications with unified governance.',
          status: SaaSProductStatus.ACTIVE,
        },
        update: {},
      });

      const allProducts = await this.prisma.saaSProduct.findMany({ select: { id: true } });
      for (const prod of allProducts) {
        try {
          await this.prisma.saaSBundleItem.upsert({
            where: {
              bundleId_productId: {
                bundleId: fullSuiteBundle.id,
                productId: prod.id,
              },
            },
            create: {
              bundleId: fullSuiteBundle.id,
              productId: prod.id,
            },
            update: {},
          });
        } catch (_) {}
      }

      // Full Suite Plan
      const fullSuitePlan = await this.prisma.saaSPlan.upsert({
        where: { code: 'full_suite_enterprise_monthly' },
        create: {
          name: 'Full Suite Enterprise',
          code: 'full_suite_enterprise_monthly',
          edition: PlanEdition.ENTERPRISE,
          billingInterval: BillingInterval.MONTHLY,
          isBundle: true,
          status: PlanPublishStatus.PUBLISHED,
          includedSeats: 25,
          trialDays: 14,
        },
        update: { status: PlanPublishStatus.PUBLISHED },
      });

      try {
        await this.prisma.saaSPlanVersion.upsert({
          where: { planId_version: { planId: fullSuitePlan.id, version: 1 } },
          create: {
            planId: fullSuitePlan.id,
            version: 1,
            priceAmount: 249.0,
            currency: 'USD',
            featureLimits: { unlimitedApps: true, storageGB: 1000, dedicatedSupport: true },
          },
          update: {},
        });
      } catch (_) {}

      this.logger.log(`Initialized ${STANDARD_MODULES.length} platform products and default commercial plans`);
    } catch (err: any) {
      this.logger.warn(`Catalog seeding encountered recoverable note: ${err.message}`);
    }
  }

  // --- Products Catalog CRUD ---
  async listProducts(status?: SaaSProductStatus) {
    return this.prisma.saaSProduct.findMany({
      where: status ? { status } : undefined,
      include: {
        features: true,
        plans: {
          where: { status: PlanPublishStatus.PUBLISHED },
          include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(idOrSlug: string) {
    const product = await this.prisma.saaSProduct.findFirst({
      where: {
        OR: [{ id: idOrSlug.match(/^[0-9a-fA-F-]{36}$/) ? idOrSlug : undefined }, { slug: idOrSlug }],
      },
      include: {
        features: true,
        plans: {
          include: { versions: { orderBy: { version: 'desc' } } },
        },
      },
    });

    if (!product) throw new NotFoundException('SaaS product not found');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const existing = await this.prisma.saaSProduct.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Product with slug '${dto.slug}' already exists`);
    }

    return this.prisma.saaSProduct.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        icon: dto.icon || 'Box',
        category: (dto.category as any) || ProductCategory.CORE,
        dependencies: dto.dependencies || [],
      },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.saaSProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.saaSProduct.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        category: dto.category as any,
        dependencies: dto.dependencies,
      },
    });
  }

  // --- Features ---
  async addProductFeature(productId: string, dto: CreateFeatureDto) {
    const product = await this.prisma.saaSProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.saaSProductFeature.create({
      data: {
        productId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type as any,
        defaultLimit: dto.defaultLimit,
      },
    });
  }

  // --- Plans & Pricing ---
  async listPlans(productId?: string, edition?: PlanEdition) {
    return this.prisma.saaSPlan.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(edition ? { edition } : {}),
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        versions: { orderBy: { version: 'desc' } },
      },
      orderBy: [{ isBundle: 'desc' }, { edition: 'asc' }],
    });
  }

  async createPlan(dto: CreatePlanDto) {
    const code = (dto.code || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_');

    const plan = await this.prisma.saaSPlan.create({
      data: {
        productId: dto.productId || null,
        name: dto.name,
        code,
        edition: dto.edition as any,
        billingInterval: dto.billingInterval as any,
        isBundle: Boolean(dto.isBundle),
        trialDays: dto.trialDays ?? 14,
        includedSeats: dto.includedSeats ?? 5,
        status: PlanPublishStatus.DRAFT,
        versions: {
          create: {
            version: 1,
            priceAmount: dto.priceAmount,
            currency: dto.currency || 'USD',
            featureLimits: dto.featureLimits || {},
          },
        },
      },
      include: {
        versions: true,
        product: true,
      },
    });

    return plan;
  }

  async publishPlan(planId: string) {
    const plan = await this.prisma.saaSPlan.findUnique({
      where: { id: planId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.saaSPlan.update({
      where: { id: planId },
      data: { status: PlanPublishStatus.PUBLISHED },
      include: { versions: true, product: true },
    });

    await this.outbox.publish(
      'catalog.plan.published',
      'SaaSPlan',
      plan.id,
      {
        planId: plan.id,
        code: plan.code,
        name: plan.name,
        edition: plan.edition,
        priceAmount: plan.versions[0]?.priceAmount,
      },
    );

    return updated;
  }

  // --- Bundles ---
  async listBundles() {
    return this.prisma.saaSBundle.findMany({
      include: {
        bundleItems: {
          include: { product: true },
        },
      },
    });
  }

  async createBundle(dto: CreateBundleDto) {
    const code = (dto.code || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_');

    return this.prisma.saaSBundle.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        status: SaaSProductStatus.ACTIVE,
        bundleItems: {
          create: dto.productIds.map((pid) => ({ productId: pid })),
        },
      },
      include: {
        bundleItems: { include: { product: true } },
      },
    });
  }

  // --- Public Pricing Snapshot ---
  async getPublicPricingSnapshot() {
    const publishedPlans = await this.prisma.saaSPlan.findMany({
      where: { status: PlanPublishStatus.PUBLISHED },
      include: {
        product: { select: { id: true, slug: true, name: true, category: true, icon: true } },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ isBundle: 'desc' }, { edition: 'asc' }],
    });

    return publishedPlans.map((p) => {
      const latestVer = p.versions[0];
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        edition: p.edition,
        billingInterval: p.billingInterval,
        isBundle: p.isBundle,
        trialDays: p.trialDays,
        includedSeats: p.includedSeats,
        priceAmount: latestVer ? Number(latestVer.priceAmount) : 0,
        currency: latestVer ? latestVer.currency : 'USD',
        featureLimits: latestVer?.featureLimits || {},
        product: p.product,
      };
    });
  }
}
