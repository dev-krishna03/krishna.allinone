import { EnquiriesService } from './enquiries.service';
import { BadRequestException } from '@nestjs/common';

describe('EnquiriesService', () => {
  let service: EnquiriesService;
  let mockPrisma: any;
  let mockOutbox: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      marketingEnquiry: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'enq-uuid-1', ...args.data })),
      },
    };
    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    mockAudit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new EnquiriesService(mockPrisma, mockOutbox, mockAudit);
  });

  it('should persist a valid enquiry, emit an outbox event, and record audit log', async () => {
    const dto = {
      name: 'John Smith',
      email: 'john@acme.com',
      companyName: 'Acme Corp',
      productInterest: 'biz-growth',
      message: 'Interested in growth plan.',
      source: 'web-pricing',
    };

    const result = await service.createEnquiry(dto, '127.0.0.1');

    expect(result.id).toBe('enq-uuid-1');
    expect(mockPrisma.marketingEnquiry.create).toHaveBeenCalled();
    expect(mockOutbox.publish).toHaveBeenCalledWith(
      'marketing.enquiry.created',
      'MarketingEnquiry',
      'enq-uuid-1',
      expect.objectContaining({ email: 'john@acme.com', companyName: 'Acme Corp' })
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'marketing.enquiry.submitted',
        entityType: 'MarketingEnquiry',
        entityId: 'enq-uuid-1',
      })
    );
  });

  it('should reject invalid enquiries without email or name', async () => {
    const invalidDto: any = {
      name: '',
      email: '',
      companyName: '',
      message: 'test',
    };

    await expect(service.createEnquiry(invalidDto)).rejects.toThrow(BadRequestException);
  });
});
