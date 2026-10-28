import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksGovernanceService } from './webhooks-governance.service';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { WebhookSubscriptionStatus, WebhookDeliveryStatus } from '@prisma/client';

describe('WebhooksGovernanceService', () => {
  let service: WebhooksGovernanceService;
  let prismaMock: any;
  let outboxMock: any;

  beforeEach(async () => {
    prismaMock = {
      webhookSubscription: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      webhookDelivery: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    outboxMock = {
      publish: jest.fn().mockResolvedValue({ id: 'outbox_1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksGovernanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: outboxMock },
      ],
    }).compile();

    service = module.get<WebhooksGovernanceService>(WebhooksGovernanceService);
  });

  it('1. Creates webhook subscription with generated HMAC secret key', async () => {
    prismaMock.webhookSubscription.create.mockImplementation(({ data }: any) => ({
      id: 'sub_1',
      ...data,
      createdAt: new Date(),
    }));

    const result = await service.createSubscription('org_1', {
      targetUrl: 'https://api.acme.corp/webhooks/business-os',
      subscribedEvents: ['user.*', 'invoice.paid'],
    });

    expect(result.id).toBe('sub_1');
    expect(result.secretKey).toBeDefined();
    expect(result.secretKey.startsWith('whsec_')).toBe(true);
    expect(result.status).toBe(WebhookSubscriptionStatus.ACTIVE);
  });

  it('2. Dispatches test ping with HMAC signature and records delivery attempt', async () => {
    prismaMock.webhookSubscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      organizationId: 'org_1',
      targetUrl: 'https://api.acme.corp/webhooks/business-os',
      secretKey: 'whsec_test_secret_123',
      subscribedEvents: ['user.*'],
      status: WebhookSubscriptionStatus.ACTIVE,
    });

    prismaMock.webhookDelivery.create.mockImplementation(({ data }: any) => ({
      id: 'del_1',
      ...data,
      createdAt: new Date(),
    }));

    prismaMock.webhookSubscription.update.mockResolvedValue({});

    const result = await service.testSubscription('org_1', 'sub_1');

    expect(result.success).toBe(true);
    expect(result.deliveryId).toBe('del_1');
    expect(result.statusCode).toBe(200);
    expect(prismaMock.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: 'sub_1',
          eventType: 'webhook.test.ping',
          status: WebhookDeliveryStatus.DELIVERED,
        }),
      }),
    );
  });

  it('3. Dispatches outbound event to matching subscribers and skips non-matching', async () => {
    prismaMock.webhookSubscription.findMany.mockResolvedValue([
      {
        id: 'sub_match',
        secretKey: 'whsec_key_1',
        subscribedEvents: ['invoice.*'],
      },
      {
        id: 'sub_no_match',
        secretKey: 'whsec_key_2',
        subscribedEvents: ['user.*'],
      },
    ]);

    prismaMock.webhookDelivery.create.mockImplementation(({ data }: any) => ({
      id: 'del_match',
      ...data,
    }));

    prismaMock.webhookSubscription.update.mockResolvedValue({});

    const results = await service.dispatchOutboundEvent('org_1', 'invoice.paid', {
      invoiceId: 'inv_101',
      amount: 49.0,
    });

    expect(results.length).toBe(1);
    expect(results[0].subscriptionId).toBe('sub_match');
  });
});
