import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import {
  EntitlementStatus,
  SeatStatus,
} from '@prisma/client';
import {
  SubscribeEntitlementDto,
  AssignSeatDto,
  RecordUsageDto,
  EffectiveAppNavigation,
} from '@business-os/types';

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * List all subscriptions / entitlements of an organization
   */
  async listTenantEntitlements(orgId: string) {
    const entitlements = await this.prisma.orgEntitlement.findMany({
      where: { organizationId: orgId },
      include: {
        product: true,
        bundle: {
          include: {
            bundleItems: { include: { product: true } },
          },
        },
        plan: true,
        planVersion: true,
        _count: {
          select: { seats: { where: { status: SeatStatus.ACTIVE } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return entitlements.map((e) => ({
      ...e,
      assignedSeatsCount: e._count.seats,
    }));
  }

  /**
   * Subscribe tenant to a plan or bundle
   */
  async subscribeTenant(
    orgId: string,
    dto: SubscribeEntitlementDto,
    actorId?: string,
  ) {
    const plan = await this.prisma.saaSPlan.findUnique({
      where: { id: dto.planId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    const planVersion = dto.planVersionId
      ? await this.prisma.saaSPlanVersion.findUnique({ where: { id: dto.planVersionId } })
      : plan.versions[0];

    if (!planVersion) throw new BadRequestException('No valid plan version found for this plan');

    let bundleId: string | null = null;
    let productId: string | null = plan.productId;

    if (plan.isBundle) {
      // Find default bundle matching the plan code or name
      const bundle = await this.prisma.saaSBundle.findFirst();
      if (bundle) bundleId = bundle.id;
    }

    const now = new Date();
    const effectiveTo = dto.isTrial
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const seatLimit = dto.seats || plan.includedSeats;

    const entitlement = await this.prisma.orgEntitlement.create({
      data: {
        organizationId: orgId,
        productId,
        bundleId,
        planId: plan.id,
        planVersionId: planVersion.id,
        status: dto.isTrial ? EntitlementStatus.TRIAL : EntitlementStatus.ACTIVE,
        effectiveFrom: now,
        effectiveTo,
        assignedSeatsLimit: seatLimit,
      },
      include: {
        product: true,
        bundle: true,
        plan: true,
      },
    });

    await this.outbox.publish(
      'entitlement.changed',
      'OrgEntitlement',
      entitlement.id,
      {
        orgId,
        entitlementId: entitlement.id,
        planCode: plan.code,
        status: entitlement.status,
        seatLimit,
        actorId,
      },
    );

    return entitlement;
  }

  /**
   * List Seat Assignments
   */
  async listSeatAssignments(orgId: string, entitlementId?: string) {
    return this.prisma.orgSeatAssignment.findMany({
      where: {
        organizationId: orgId,
        ...(entitlementId ? { entitlementId } : {}),
      },
      include: {
        member: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        product: true,
        entitlement: {
          include: { plan: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  /**
   * Assign Seat to Member with transactional seat limit enforcement
   */
  async assignSeat(
    orgId: string,
    dto: AssignSeatDto,
    actorId?: string,
  ) {
    const entitlement = await this.prisma.orgEntitlement.findFirst({
      where: {
        id: dto.entitlementId,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: { seats: { where: { status: SeatStatus.ACTIVE } } },
        },
      },
    });

    if (!entitlement) throw new NotFoundException('Entitlement subscription not found');

    if (!([EntitlementStatus.ACTIVE, EntitlementStatus.TRIAL] as EntitlementStatus[]).includes(entitlement.status)) {
      throw new BadRequestException(
        `Cannot allocate seats for entitlement with status: ${entitlement.status}`,
      );
    }

    // Strict non-negotiable concurrency check: prevent oversell
    if (entitlement._count.seats >= entitlement.assignedSeatsLimit) {
      throw new ConflictException(
        `Seat limit exceeded: all ${entitlement.assignedSeatsLimit} seats are currently assigned. Upgrade your plan or purchase additional seats.`,
      );
    }

    const assignment = await this.prisma.orgSeatAssignment.upsert({
      where: {
        organizationId_memberId_entitlementId: {
          organizationId: orgId,
          memberId: dto.memberId,
          entitlementId: dto.entitlementId,
        },
      },
      create: {
        organizationId: orgId,
        memberId: dto.memberId,
        entitlementId: dto.entitlementId,
        productId: dto.productId || entitlement.productId,
        status: SeatStatus.ACTIVE,
      },
      update: {
        status: SeatStatus.ACTIVE,
      },
      include: {
        member: {
          include: { user: true },
        },
        product: true,
      },
    });

    await this.outbox.publish(
      'seat.assigned',
      'OrgSeatAssignment',
      assignment.id,
      {
        orgId,
        memberId: dto.memberId,
        entitlementId: dto.entitlementId,
        productId: assignment.productId,
        actorId,
      },
    );

    return assignment;
  }

  /**
   * Revoke Seat Assignment
   */
  async revokeSeat(orgId: string, assignmentId: string, actorId?: string) {
    const assignment = await this.prisma.orgSeatAssignment.findFirst({
      where: { id: assignmentId, organizationId: orgId },
    });

    if (!assignment) throw new NotFoundException('Seat assignment not found');

    await this.prisma.orgSeatAssignment.delete({
      where: { id: assignmentId },
    });

    await this.outbox.publish(
      'seat.revoked',
      'OrgSeatAssignment',
      assignmentId,
      {
        orgId,
        assignmentId,
        memberId: assignment.memberId,
        actorId,
      },
    );

    return { success: true };
  }

  /**
   * Effective App Navigation Resolver for Member
   */
  async resolveEffectiveAppNavigation(
    orgId: string,
    memberId: string,
  ): Promise<EffectiveAppNavigation> {
    const [allProducts, entitlements, memberSeats] = await Promise.all([
      this.prisma.saaSProduct.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
      this.prisma.orgEntitlement.findMany({
        where: {
          organizationId: orgId,
          status: { in: [EntitlementStatus.ACTIVE, EntitlementStatus.TRIAL] },
        },
        include: {
          bundle: {
            include: { bundleItems: true },
          },
          plan: true,
        },
      }),
      this.prisma.orgSeatAssignment.findMany({
        where: {
          organizationId: orgId,
          memberId,
          status: SeatStatus.ACTIVE,
        },
      }),
    ]);

    const entitledProductIds = new Set<string>();
    const productEditions = new Map<string, any>();

    for (const ent of entitlements) {
      if (ent.productId) {
        entitledProductIds.add(ent.productId);
        productEditions.set(ent.productId, ent.plan.edition);
      }
      if (ent.bundle) {
        for (const item of ent.bundle.bundleItems) {
          entitledProductIds.add(item.productId);
          productEditions.set(item.productId, ent.plan.edition);
        }
      }
    }

    const availableApps = allProducts.map((p) => {
      // Core workspace is always entitled
      const isCore = p.slug === 'workspace' || p.category === 'CORE';
      const isEntitled = isCore || entitledProductIds.has(p.id);
      const requiresSeat = !isCore;
      const hasSeat = isCore || memberSeats.some((s) => s.productId === p.id || !s.productId);

      return {
        slug: p.slug,
        name: p.name,
        icon: p.icon,
        category: p.category,
        edition: productEditions.get(p.id) || 'STARTER',
        isCore,
        isEntitled,
        hasSeat,
        requiresSeat,
        launchUrl: `/app/${p.slug}`,
      };
    });

    return { availableApps };
  }

  /**
   * Usage Metering Engine
   */
  async getTenantUsage(orgId: string) {
    return this.prisma.usageMeter.findMany({
      where: { organizationId: orgId },
      orderBy: { periodStart: 'desc' },
    });
  }

  async recordUsage(orgId: string, dto: RecordUsageDto) {
    // Idempotency: verify operationId has not already been processed
    const existing = await this.prisma.usageEvent.findUnique({
      where: { operationId: dto.operationId },
    });

    if (existing) {
      return { status: 'DUPLICATE_IGNORED', operationId: dto.operationId };
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [usageEvent, meter] = await this.prisma.$transaction(async (tx) => {
      const evt = await tx.usageEvent.create({
        data: {
          organizationId: orgId,
          operationId: dto.operationId,
          featureCode: dto.featureCode,
          quantity: dto.quantity,
          metadata: dto.metadata || {},
        },
      });

      const met = await tx.usageMeter.upsert({
        where: {
          organizationId_featureCode_periodStart: {
            organizationId: orgId,
            featureCode: dto.featureCode,
            periodStart,
          },
        },
        create: {
          organizationId: orgId,
          featureCode: dto.featureCode,
          periodStart,
          periodEnd,
          currentUsage: dto.quantity,
          softLimit: 1000,
          hardLimit: 2000,
        },
        update: {
          currentUsage: { increment: dto.quantity },
        },
      });

      return [evt, met];
    });

    // Check soft limit breach and emit alert event
    if (meter.softLimit && Number(meter.currentUsage) >= Number(meter.softLimit)) {
      await this.outbox.publish(
        'usage.threshold.reached',
        'UsageMeter',
        meter.id,
        {
          orgId,
          featureCode: dto.featureCode,
          currentUsage: Number(meter.currentUsage),
          softLimit: Number(meter.softLimit),
          hardLimit: meter.hardLimit ? Number(meter.hardLimit) : null,
        },
      );
    }

    return {
      success: true,
      status: 'RECORDED',
      operationId: usageEvent.operationId,
      currentUsage: Number(meter.currentUsage),
    };
  }
}
