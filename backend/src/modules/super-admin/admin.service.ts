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
      this.prisma.identityUser.count({ where: { status: 'ACTIVE' } }),
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
          select: { members: true, apiClients: true },
        },
      },
    });
  }

  async getSecurityTelemetry() {
    const [
      customRolesCount,
      builtInRolesCount,
      teamsCount,
      sharesCount,
      fieldPoliciesCount,
      securityEventsCount,
      recentEvents,
    ] = await Promise.all([
      this.prisma.orgRole.count({ where: { isBuiltIn: false } }),
      this.prisma.orgRole.count({ where: { isBuiltIn: true } }),
      this.prisma.orgTeam.count(),
      this.prisma.recordAccessGrant.count(),
      this.prisma.orgFieldPolicy.count(),
      this.prisma.securityAuditEvent.count(),
      this.prisma.securityAuditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          targetType: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      aggregate: {
        customRolesCount,
        builtInRolesCount,
        totalConfiguredRoles: customRolesCount + builtInRolesCount,
        teamsCount,
        activeFieldPoliciesCount: fieldPoliciesCount,
        directRecordGrantsCount: sharesCount,
        totalSecurityEvents: securityEventsCount,
      },
      recentEvents,
      status: 'HEALTHY',
      generatedAt: new Date().toISOString(),
    };
  }
}
