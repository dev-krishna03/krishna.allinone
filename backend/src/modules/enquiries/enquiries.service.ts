import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { AuditService } from '../../platform/audit/audit.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  async createEnquiry(dto: CreateEnquiryDto, ipAddress?: string) {
    if (!dto.email || !dto.name || !dto.companyName) {
      throw new BadRequestException('Name, email, and company name are required');
    }

    // Persist to marketing_enquiries
    const enquiry = await this.prisma.marketingEnquiry.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        companyName: dto.companyName,
        productInterest: dto.productInterest,
        message: dto.message,
        source: dto.source || 'website',
        ipAddress,
      },
    });

    // Transactional outbox event
    await this.outbox.publish(
      'marketing.enquiry.created',
      'MarketingEnquiry',
      enquiry.id,
      {
        enquiryId: enquiry.id,
        email: enquiry.email,
        companyName: enquiry.companyName,
        productInterest: enquiry.productInterest,
        source: enquiry.source,
      }
    );

    // Audit log
    await this.audit.record({
      action: 'marketing.enquiry.submitted',
      entityType: 'MarketingEnquiry',
      entityId: enquiry.id,
      metadata: { email: enquiry.email, companyName: enquiry.companyName },
      ipAddress,
    });

    return enquiry;
  }

  async listEnquiries(limit = 50) {
    return this.prisma.marketingEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
