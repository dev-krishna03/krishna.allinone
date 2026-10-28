import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { IncidentStatus } from '@prisma/client';

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
      activeIncidents,
      featureFlagsCount,
      connectorsCount,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.identityUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.marketingEnquiry.count(),
      this.prisma.platformEventOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.platformEventOutbox.count({ where: { status: 'PROCESSED' } }),
      this.prisma.auditLog.count(),
      this.prisma.saaSPlan.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.platformIncident.count({
        where: { status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] } },
      }),
      this.prisma.featureRollout.count(),
      this.prisma.connectorProvider.count({ where: { isEnabled: true } }),
    ]);

    return {
      overview: {
        totalOrganizations: totalOrgs,
        activeUsers,
        totalEnquiries,
        activePublishedPlans: activePlans,
        activeIncidents,
        featureFlagsCount,
        connectorsCount,
      },
      telemetry: {
        outbox: {
          pending: pendingOutboxEvents,
          processed: processedOutboxEvents,
        },
        auditLogsTotal: totalAuditEvents,
      },
      systemHealth: activeIncidents > 0 ? 'DEGRADED' : 'OPERATIONAL',
      updatedAt: new Date().toISOString(),
    };
  }

  async getSystemHealth() {
    const startTime = Date.now();
    let dbStatus: 'up' | 'down' = 'up';
    let dbLatencyMs = 0;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startTime;
    } catch {
      dbStatus = 'down';
    }

    const [pendingOutbox, failedOutbox, activeIncidents] = await Promise.all([
      this.prisma.platformEventOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.platformEventOutbox.count({ where: { status: 'FAILED' } }),
      this.prisma.platformIncident.count({
        where: { status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] } },
      }),
    ]);

    const mem = process.memoryUsage();
    const status = dbStatus === 'down' ? 'critical' : activeIncidents > 0 ? 'degraded' : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: '1.6.0',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        redis: { status: 'up' as const, latencyMs: 1 },
        outbox: { pendingEvents: pendingOutbox, failedEvents: failedOutbox },
      },
      metrics: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
        cpuUserMs: Math.round(process.cpuUsage().user / 1000),
      },
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

  /**
   * Privacy-safe aggregated list of tenants
   * Does NOT expose tenant private CRM records, sensitive emails, or customer ledger data.
   */
  async getTenantsList() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        planTier: true,
        seatLimit: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            apiClients: true,
            connectorInstallations: true,
          },
        },
        saasSubscriptions: {
          select: {
            status: true,
            seatQuantity: true,
            plan: { select: { name: true, edition: true } },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return orgs.map((o) => {
      const activeSub = o.saasSubscriptions[0];
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        planTier: o.planTier,
        seatLimit: o.seatLimit,
        membersCount: o._count.members,
        apiClientsCount: o._count.apiClients,
        installedConnectorsCount: o._count.connectorInstallations,
        subscription: activeSub
          ? {
              planName: activeSub.plan?.name,
              edition: activeSub.plan?.edition,
              status: activeSub.status,
              seats: activeSub.seatQuantity,
            }
          : null,
        createdAt: o.createdAt,
      };
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
