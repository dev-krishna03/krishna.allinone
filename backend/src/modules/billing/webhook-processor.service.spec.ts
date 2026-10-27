import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { StripeProviderAdapter } from './adapters/stripe-provider.adapter';
import { RazorpayProviderAdapter } from './adapters/razorpay-provider.adapter';
import { DunningService } from './dunning.service';
import { ProviderEventStatus, SaaSSubscriptionStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;

  const mockPrisma = {
    saaSProviderEvent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    saaSCustomer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    saaSSubscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    saaSPlan: {
      findFirst: jest.fn(),
    },
    orgEntitlement: {
      updateMany: jest.fn(),
    },
    saaSInvoice: {
      create: jest.fn(),
    },
    saaSPayment: {
      create: jest.fn(),
    },
    saaSRefund: {
      create: jest.fn(),
    },
  };

  const mockOutbox = {
    publish: jest.fn().mockResolvedValue({ id: 'outbox_wh' }),
  };

  const mockDunningService = {
    handlePaymentRecovery: jest.fn().mockResolvedValue(undefined),
    handlePaymentFailure: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: DunningService, useValue: mockDunningService },
        StripeProviderAdapter,
        RazorpayProviderAdapter,
      ],
    }).compile();

    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  it('1. Rejects invalid webhook HMAC signature with BadRequestException', async () => {
    const payload = JSON.stringify({ id: 'evt_fake', type: 'invoice.paid' });

    mockPrisma.saaSProviderEvent.findUnique.mockResolvedValue(null);
    mockPrisma.saaSProviderEvent.upsert.mockResolvedValue({
      id: 'pevt_1',
      status: ProviderEventStatus.FAILED,
    });

    await expect(
      service.processIncomingWebhook('STRIPE', payload, 'invalid_signature_xyz'),
    ).rejects.toThrow(BadRequestException);
  });

  it('2. Ingests valid invoice.paid webhook, activates subscription, records invoice and emits outbox event', async () => {
    const payload = JSON.stringify({
      id: 'evt_stripe_paid_123',
      type: 'invoice.paid',
      data: {
        customer: 'cus_test_123',
        amount_paid: 4900,
        currency: 'usd',
        number: 'INV-2026-0001',
      },
    });

    mockPrisma.saaSProviderEvent.findUnique.mockResolvedValue(null);
    mockPrisma.saaSProviderEvent.upsert.mockResolvedValue({
      id: 'pevt_123',
      status: ProviderEventStatus.RECEIVED,
    });
    mockPrisma.saaSProviderEvent.update.mockResolvedValue({});

    mockPrisma.saaSCustomer.findFirst.mockResolvedValue({
      id: 'cust_1',
      organizationId: 'org_1',
      providerCustomerId: 'cus_test_123',
    });

    mockPrisma.saaSSubscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      organizationId: 'org_1',
      planId: 'plan_growth',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });

    mockPrisma.saaSSubscription.update.mockResolvedValue({});
    mockPrisma.orgEntitlement.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.saaSInvoice.create.mockResolvedValue({
      id: 'inv_1',
      invoiceNumber: 'INV-2026-0001',
      totalAmount: 49,
      currency: 'USD',
    });
    mockPrisma.saaSPayment.create.mockResolvedValue({ id: 'pay_1' });

    const result = await service.processIncomingWebhook(
      'STRIPE',
      payload,
      'valid_test_signature',
    );

    expect(result.status).toBe('PROCESSED');
    expect(mockPrisma.saaSSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: { status: SaaSSubscriptionStatus.ACTIVE },
    });
    expect(mockDunningService.handlePaymentRecovery).toHaveBeenCalledWith('sub_1', 'inv_1');
    expect(mockOutbox.publish).toHaveBeenCalledWith(
      'saas.invoice.paid',
      'SaaSInvoice',
      'inv_1',
      expect.objectContaining({ invoiceNumber: 'INV-2026-0001' }),
    );
  });

  it('3. Deduplicates previously processed webhook event without reprocessing', async () => {
    mockPrisma.saaSProviderEvent.findUnique.mockResolvedValue({
      id: 'pevt_done',
      eventId: 'evt_stripe_duplicate',
      status: ProviderEventStatus.PROCESSED,
    });

    const result = await service.processIncomingWebhook(
      'STRIPE',
      JSON.stringify({ id: 'evt_stripe_duplicate', type: 'invoice.paid' }),
      'valid_test_signature',
    );

    expect(result.status).toBe('ALREADY_PROCESSED');
    expect(mockPrisma.saaSSubscription.update).not.toHaveBeenCalled();
    expect(mockOutbox.publish).not.toHaveBeenCalled();
  });
});
