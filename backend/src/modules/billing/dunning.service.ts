import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { DunningStatus, SaaSSubscriptionStatus } from '@prisma/client';

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Records a failed payment attempt and initiates/updates dunning run
   */
  async handlePaymentFailure(subscriptionId: string, invoiceId: string, errorReason?: string) {
    const subscription = await this.prisma.saaSSubscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) return;

    const existingRun = await this.prisma.saaSDunningRun.findFirst({
      where: {
        subscriptionId,
        invoiceId,
        status: DunningStatus.IN_PROGRESS,
      },
    });

    const now = new Date();
    const graceDays = 7;
    const gracePeriodEnd = existingRun?.gracePeriodEnd || new Date(now.getTime() + graceDays * 86400000);

    let dunningRun;
    if (existingRun) {
      const nextAttemptDays = Math.min(3, existingRun.attemptCount + 1);
      const nextAttemptAt = new Date(now.getTime() + nextAttemptDays * 86400000);
      const isFinalAttempt = existingRun.attemptCount + 1 >= existingRun.maxAttempts;

      dunningRun = await this.prisma.saaSDunningRun.update({
        where: { id: existingRun.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
          nextAttemptAt: isFinalAttempt ? null : nextAttemptAt,
          status: isFinalAttempt ? DunningStatus.FAILED : DunningStatus.IN_PROGRESS,
        },
      });
    } else {
      dunningRun = await this.prisma.saaSDunningRun.create({
        data: {
          subscriptionId,
          invoiceId,
          attemptCount: 1,
          maxAttempts: 4,
          status: DunningStatus.IN_PROGRESS,
          lastAttemptAt: now,
          nextAttemptAt: new Date(now.getTime() + 2 * 86400000),
          gracePeriodEnd,
        },
      });
    }

    // Mark subscription PAST_DUE if not already
    if (subscription.status !== SaaSSubscriptionStatus.PAST_DUE) {
      await this.prisma.saaSSubscription.update({
        where: { id: subscriptionId },
        data: { status: SaaSSubscriptionStatus.PAST_DUE },
      });

      await this.prisma.saaSSubscriptionEvent.create({
        data: {
          subscriptionId,
          previousStatus: subscription.status,
          newStatus: SaaSSubscriptionStatus.PAST_DUE,
          reason: `Payment failed for invoice ${invoiceId}: ${errorReason || 'Card declined'}`,
        },
      });
    }

    // Publish Outbox event for dunning notification
    await this.outbox.publish(
      'saas.dunning.attempted',
      'SaaSDunningRun',
      dunningRun.id,
      {
        organizationId: subscription.organizationId,
        subscriptionId,
        invoiceId,
        attemptCount: dunningRun.attemptCount,
        maxAttempts: dunningRun.maxAttempts,
        gracePeriodEnd: dunningRun.gracePeriodEnd,
        errorReason,
      },
    );

    this.logger.warn(
      `Dunning attempt ${dunningRun.attemptCount}/${dunningRun.maxAttempts} for subscription ${subscriptionId}`,
    );

    return dunningRun;
  }

  /**
   * Recovers in-progress dunning run upon successful payment
   */
  async handlePaymentRecovery(subscriptionId: string, invoiceId: string) {
    const run = await this.prisma.saaSDunningRun.findFirst({
      where: {
        subscriptionId,
        invoiceId,
        status: DunningStatus.IN_PROGRESS,
      },
    });

    if (run) {
      await this.prisma.saaSDunningRun.update({
        where: { id: run.id },
        data: {
          status: DunningStatus.RECOVERED,
          nextAttemptAt: null,
        },
      });

      this.logger.log(`Dunning run ${run.id} recovered successfully upon payment settlement`);
    }
  }

  async listDunningRuns(subscriptionId?: string) {
    return this.prisma.saaSDunningRun.findMany({
      where: subscriptionId ? { subscriptionId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
