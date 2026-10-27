import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalMetrics() {
    const [
      totalOrgs,
      activeUsers,
      totalEnquiries,
      pendingOutboxEvents,
      processedOutboxEvents,
      totalAuditEvents,
      activePlans,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.marketingEnquiry.count(),
      this.prisma.platformEventOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.platformEventOutbox.count({ where: { status: 'PROCESSED' } }),
      this.prisma.auditLog.count(),
      this.prisma.productCatalogPlaceholder.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      overview: {
        totalOrganizations: totalOrgs,
        activeUsers,
        totalEnquiries,
        activePublishedPlans: activePlans,
      },
      telemetry: {
        outbox: {
          pending: pendingOutboxEvents,
          processed: processedOutboxEvents,
        },
        auditLogsTotal: totalAuditEvents,
      },
      systemHealth: 'OPERATIONAL',
      updatedAt: new Date().toISOString(),
    };
  }

  async getRecentAuditLogs(limit = 25) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
        organizationId: true,
      },
    });
  }

  async getTenantsList() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        planTier: true,
        createdAt: true,
        _count: {
          select: { users: true, apiClients: true },
        },
      },
    });
  }
}
