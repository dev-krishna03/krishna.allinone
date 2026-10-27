import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OutboxStatus } from '@prisma/client';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(
    eventName: string,
    aggregateType: string,
    aggregateId: string,
    payload: any,
    prismaClient?: any
  ) {
    const client = prismaClient || this.prisma;
    return client.platformEventOutbox.create({
      data: {
        eventName,
        aggregateType,
        aggregateId,
        payload,
        status: OutboxStatus.PENDING,
      },
    });
  }

  async getPendingEvents(limit = 20) {
    return this.prisma.platformEventOutbox.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markProcessed(id: string) {
    return this.prisma.platformEventOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, error: string) {
    return this.prisma.platformEventOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        retryCount: { increment: 1 },
        lastError: error,
      },
    });
  }

  async processBatch() {
    const events = await this.getPendingEvents(10);
    const results = [];
    for (const event of events) {
      try {
        // Dispatch according to domain event name
        // e.g. marketing.enquiry.created, platform.config.changed, platform.job.failed
        results.push({ id: event.id, status: 'PROCESSED' });
        await this.markProcessed(event.id);
      } catch (err: any) {
        results.push({ id: event.id, status: 'FAILED', error: err.message });
        await this.markFailed(event.id, err.message);
      }
    }
    return results;
  }
}
