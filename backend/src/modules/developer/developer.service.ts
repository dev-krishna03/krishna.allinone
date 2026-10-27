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

  async getSecurityDiagnostics() {
    const [permissions, totalVersions, securityOutboxEvents] = await Promise.all([
      this.prisma.platformPermissionRegistry.findMany({
        select: { id: true, module: true, resource: true, action: true, sensitivity: true },
      }),
      this.prisma.accessPolicyVersion.count(),
      this.prisma.platformEventOutbox.findMany({
        where: { eventName: { startsWith: 'security.' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          eventName: true,
          aggregateType: true,
          status: true,
          retryCount: true,
          createdAt: true,
        },
      }),
    ]);

    const moduleCounts: Record<string, number> = {};
    for (const p of permissions) {
      moduleCounts[p.module] = (moduleCounts[p.module] || 0) + 1;
    }

    return {
      permissionRegistry: {
        totalRegistered: permissions.length,
        moduleDistribution: moduleCounts,
      },
      policyEngine: {
        mode: 'DENY_BY_DEFAULT',
        roleHierarchy: 'ENABLED',
        recordScopes: ['OWNER_ONLY', 'TEAM', 'DEPARTMENT', 'ALL'],
        fieldSecurity: ['READ_WRITE', 'READ_ONLY', 'HIDE', 'MASK'],
        activePolicyVersionsTracked: totalVersions,
      },
      securityEventsOutbox: securityOutboxEvents,
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
    };
  }
}
