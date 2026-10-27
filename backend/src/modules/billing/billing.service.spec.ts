import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { StripeProviderAdapter } from './adapters/stripe-provider.adapter';
import { RazorpayProviderAdapter } from './adapters/razorpay-provider.adapter';
import { SaaSSubscriptionStatus, PlanEdition, PlanPublishStatus } from '@prisma/client';

describe('BillingService', () => {
  let service: BillingService;

  const mockPrisma = {
    saaSCustomer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    saaSPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    saaSPlanVersion: {
      findUnique: jest.fn(),
    },
    saaSSubscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    saaSCheckoutSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    saaSSubscriptionTerm: {
      create: jest.fn(),
    },
    saaSSubscriptionEvent: {
      create: jest.fn(),
    },
    orgEntitlement: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    saaSInvoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    saaSPayment: {
      findMany: jest.fn(),
    },
  };

  const mockOutbox = {
    publish: jest.fn().mockResolvedValue({ id: 'outbox_1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: mockOutbox },
        StripeProviderAdapter,
        RazorpayProviderAdapter,
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('1. Computes signed quote with accurate unit rate, seat total, and 10% estimated tax', async () => {
    mockPrisma.saaSPlan.findUnique.mockResolvedValue({
      id: 'plan_1',
      name: 'Growth Edition',
      edition: PlanEdition.GROWTH,
      billingInterval: 'MONTHLY',
      includedSeats: 5,
      versions: [
        {
          id: 'ver_1',
          version: 1,
          priceAmount: '49.00',
          currency: 'USD',
        },
      ],
    });

    mockPrisma.saaSPlanVersion.findUnique.mockResolvedValue({
      id: 'ver_1',
      version: 1,
      priceAmount: '49.00',
      currency: 'USD',
    });

    mockPrisma.saaSSubscription.findFirst.mockResolvedValue(null);

    const quote = await service.computeQuote('org_1', {
      planId: 'plan_1',
      seatQuantity: 5,
    });

    expect(quote.unitPrice).toBe(49);
    expect(quote.subtotal).toBe(245); // 49 * 5
    expect(quote.estimatedTax).toBe(24.5); // 10%
    expect(quote.totalAmount).toBe(269.5);
    expect(quote.signature).toBeDefined();
    expect(quote.expiresAt).toBeDefined();
  });

  it('2. Computes proration preview when upgrading active subscription midway through cycle', async () => {
    mockPrisma.saaSPlan.findUnique.mockResolvedValue({
      id: 'plan_enterprise',
      name: 'Enterprise Edition',
      edition: PlanEdition.ENTERPRISE,
      billingInterval: 'MONTHLY',
      includedSeats: 10,
      versions: [
        {
          id: 'ver_ent_1',
          version: 1,
          priceAmount: '100.00',
          currency: 'USD',
        },
      ],
    });

    const now = Date.now();
    const cycleStart = new Date(now - 15 * 86400000); // 15 days ago
    const cycleEnd = new Date(now + 15 * 86400000); // 15 days remaining (50% remaining)

    mockPrisma.saaSSubscription.findFirst.mockResolvedValue({
      id: 'sub_active',
      organizationId: 'org_1',
      status: SaaSSubscriptionStatus.ACTIVE,
      seatQuantity: 5,
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
      planVersion: {
        priceAmount: '50.00',
      },
    });

    const quote = await service.computeQuote('org_1', {
      planId: 'plan_enterprise',
      seatQuantity: 10,
    });

    expect(quote.proration).toBeDefined();
    expect(quote.proration.isProrated).toBe(true);
    expect(quote.proration.creditAmount).toBeGreaterThan(0);
    expect(quote.proration.netPayable).toBeLessThan(quote.totalAmount);
  });

  it('3. Creates checkout session and emits saas.checkout.created outbox event', async () => {
    mockPrisma.saaSCheckoutSession.findUnique.mockResolvedValue(null);
    mockPrisma.saaSCustomer.findUnique.mockResolvedValue({
      id: 'cust_1',
      organizationId: 'org_1',
      provider: 'STRIPE',
      providerCustomerId: 'cus_stripe_123',
    });

    mockPrisma.saaSPlan.findUnique.mockResolvedValue({
      id: 'plan_1',
      name: 'Growth Edition',
      edition: PlanEdition.GROWTH,
      billingInterval: 'MONTHLY',
      includedSeats: 5,
      versions: [{ id: 'ver_1', priceAmount: '50.00', currency: 'USD' }],
    });

    mockPrisma.saaSPlanVersion.findUnique.mockResolvedValue({
      id: 'ver_1',
      priceAmount: '50.00',
      currency: 'USD',
    });

    mockPrisma.saaSSubscription.findFirst.mockResolvedValue(null);

    mockPrisma.saaSCheckoutSession.create.mockResolvedValue({
      id: 'session_123',
      organizationId: 'org_1',
      amountTotal: 275,
      currency: 'USD',
      status: 'OPEN',
      successUrl: 'https://checkout.stripe.com/pay/cs_test',
    });

    const session = await service.createCheckoutSession('org_1', {
      planId: 'plan_1',
      seatQuantity: 5,
    });

    expect(session.id).toBe('session_123');
    expect(mockOutbox.publish).toHaveBeenCalledWith(
      'saas.checkout.created',
      'SaaSCheckoutSession',
      'session_123',
      expect.objectContaining({ organizationId: 'org_1' }),
    );
  });

  it('4. Immediately cancels subscription and sets OrgEntitlement to CANCELLED', async () => {
    mockPrisma.saaSSubscription.findFirst.mockResolvedValue({
      id: 'sub_to_cancel',
      organizationId: 'org_1',
      planId: 'plan_1',
      status: SaaSSubscriptionStatus.ACTIVE,
    });

    mockPrisma.saaSSubscription.update.mockResolvedValue({
      id: 'sub_to_cancel',
      status: SaaSSubscriptionStatus.CANCELLED,
    });

    mockPrisma.orgEntitlement.updateMany.mockResolvedValue({ count: 1 });

    const cancelled = await service.cancelSubscription('org_1', true, 'user_admin');

    expect(cancelled.status).toBe(SaaSSubscriptionStatus.CANCELLED);
    expect(mockPrisma.orgEntitlement.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', planId: 'plan_1' },
      data: { status: 'CANCELLED' },
    });
    expect(mockOutbox.publish).toHaveBeenCalledWith(
      'saas.subscription.expired',
      'SaaSSubscription',
      'sub_to_cancel',
      expect.objectContaining({ status: 'CANCELLED' }),
    );
  });
});
