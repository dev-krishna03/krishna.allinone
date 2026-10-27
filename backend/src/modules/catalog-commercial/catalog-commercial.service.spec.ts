import { CatalogCommercialService, STANDARD_MODULES } from './catalog-commercial.service';
import { PlanPublishStatus, SaaSProductStatus, PlanEdition, BillingInterval } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('CatalogCommercialService', () => {
  let service: CatalogCommercialService;
  let mockPrisma: any;
  let mockOutbox: any;

  beforeEach(() => {
    mockPrisma = {
      saaSProduct: {
        upsert: jest.fn().mockResolvedValue({ id: 'prod-1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      saaSProductFeature: {
        create: jest.fn(),
      },
      saaSPlan: {
        upsert: jest.fn().mockResolvedValue({ id: 'plan-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      saaSPlanVersion: {
        upsert: jest.fn().mockResolvedValue({ id: 'ver-1' }),
      },
      saaSBundle: {
        upsert: jest.fn().mockResolvedValue({ id: 'bundle-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      saaSBundleItem: {
        upsert: jest.fn().mockResolvedValue({ id: 'item-1' }),
      },
    };

    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };

    service = new CatalogCommercialService(mockPrisma, mockOutbox);
  });

  it('should initialize 14 standard Business OS modules', async () => {
    await service.seedStandardCatalog();

    expect(mockPrisma.saaSProduct.upsert).toHaveBeenCalledTimes(STANDARD_MODULES.length);
    expect(STANDARD_MODULES.length).toBe(14);
  });

  it('should create new product with unique slug', async () => {
    mockPrisma.saaSProduct.findUnique.mockResolvedValue(null);
    mockPrisma.saaSProduct.create.mockResolvedValue({
      id: 'prod-crm',
      slug: 'crm_enterprise',
      name: 'CRM Enterprise',
    });

    const product = await service.createProduct({
      slug: 'crm_enterprise',
      name: 'CRM Enterprise',
      description: 'Advanced sales automation',
    });

    expect(product.id).toBe('prod-crm');
    expect(mockPrisma.saaSProduct.create).toHaveBeenCalled();
  });

  it('should throw ConflictException if product slug is already taken', async () => {
    mockPrisma.saaSProduct.findUnique.mockResolvedValue({ id: 'existing-prod' });

    await expect(
      service.createProduct({
        slug: 'crm',
        name: 'CRM',
        description: 'Duplicate',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should publish plan and emit catalog.plan.published outbox event', async () => {
    mockPrisma.saaSPlan.findUnique.mockResolvedValue({
      id: 'plan-growth',
      code: 'crm_growth',
      name: 'CRM Growth',
      edition: PlanEdition.GROWTH,
      versions: [{ priceAmount: 49 }],
    });

    mockPrisma.saaSPlan.update.mockResolvedValue({
      id: 'plan-growth',
      code: 'crm_growth',
      status: PlanPublishStatus.PUBLISHED,
    });

    const published = await service.publishPlan('plan-growth');
    expect(published.status).toBe(PlanPublishStatus.PUBLISHED);
    expect(mockOutbox.publish).toHaveBeenCalledWith(
      'catalog.plan.published',
      'SaaSPlan',
      'plan-growth',
      expect.anything(),
    );
  });
});
