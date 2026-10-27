import { OutboxService } from './outbox.service';
import { OutboxStatus } from '@prisma/client';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      platformEventOutbox: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'evt-1', ...args.data })),
        findMany: jest.fn().mockResolvedValue([
          { id: 'evt-1', eventName: 'marketing.enquiry.created', status: OutboxStatus.PENDING },
        ]),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
    };

    service = new OutboxService(mockPrisma);
  });

  it('should publish an event to platform_event_outbox with PENDING status', async () => {
    const event = await service.publish('marketing.enquiry.created', 'Enquiry', 'enq-100', {
      email: 'lead@corp.com',
    });

    expect(mockPrisma.platformEventOutbox.create).toHaveBeenCalledWith({
      data: {
        eventName: 'marketing.enquiry.created',
        aggregateType: 'Enquiry',
        aggregateId: 'enq-100',
        payload: { email: 'lead@corp.com' },
        status: OutboxStatus.PENDING,
      },
    });
    expect(event.id).toBe('evt-1');
  });

  it('should mark event as processed with processedAt timestamp', async () => {
    await service.markProcessed('evt-1');
    expect(mockPrisma.platformEventOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: expect.objectContaining({
          status: OutboxStatus.PROCESSED,
        }),
      })
    );
  });

  it('should increment retry count and set lastError when marked failed', async () => {
    await service.markFailed('evt-1', 'Network timeout to downstream hook');
    expect(mockPrisma.platformEventOutbox.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: {
        status: OutboxStatus.FAILED,
        retryCount: { increment: 1 },
        lastError: 'Network timeout to downstream hook',
      },
    });
  });
});
