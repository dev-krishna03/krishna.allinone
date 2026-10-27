import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';

@Injectable()
export class DeveloperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService
  ) {}

  async getDiagnostics() {
    const [pendingEvents, recentEvents, clientCount] = await Promise.all([
      this.prisma.platformEventOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.platformEventOutbox.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.apiClient.count(),
    ]);

    return {
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptimeSeconds: Math.floor(process.uptime()),
      },
      outboxQueue: {
        pendingCount: pendingEvents,
        recentEvents,
      },
      apiClientsCount: clientCount,
    };
  }

  async getApiClients(organizationId?: string) {
    return this.prisma.apiClient.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: {
        id: true,
        name: true,
        clientId: true,
        scopes: true,
        status: true,
        createdAt: true,
        revokedAt: true,
        organizationId: true,
      },
    });
  }

  async triggerOutboxReplay() {
    return this.outboxService.processBatch();
  }
}
