import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { StripeProviderAdapter } from './adapters/stripe-provider.adapter';
import { RazorpayProviderAdapter } from './adapters/razorpay-provider.adapter';
import { IPaymentProviderAdapter } from './adapters/payment-provider.interface';
import {
  ComputeQuoteDto,
  CreateCheckoutSessionDto,
  ChangeSubscriptionDto,
  UpdatePaymentMethodDto,
} from './dto/billing.dto';
import {
  SaaSSubscriptionStatus,
  CheckoutSessionStatus,
  SaaSInvoiceStatus,
  EntitlementStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly hmacSecret = process.env.BILLING_HMAC_SECRET || 'secret-saas-billing-quote-key';

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly stripeAdapter: StripeProviderAdapter,
    private readonly razorpayAdapter: RazorpayProviderAdapter,
  ) {}

  private getAdapter(provider = 'STRIPE'): IPaymentProviderAdapter {
    return provider.toUpperCase() === 'RAZORPAY' ? this.razorpayAdapter : this.stripeAdapter;
  }

  // --- 1. Customer Provisioning ---
  async getOrCreateCustomer(
    orgId: string,
    billingEmail?: string,
    billingName?: string,
    provider = 'STRIPE',
  ) {
    const existing = await this.prisma.saaSCustomer.findUnique({
      where: { organizationId: orgId },
    });
    if (existing) return existing;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const email = billingEmail || `billing@${org.slug}.businessos.local`;
    const adapter = this.getAdapter(provider);
    const { customerId } = await adapter.createCustomer({
      email,
      name: billingName || org.name,
      organizationId: orgId,
    });

    return this.prisma.saaSCustomer.create({
      data: {
        organizationId: orgId,
        providerCustomerId: customerId,
        provider,
        billingEmail: email,
        billingName: billingName || org.name,
      },
    });
  }

  // --- 2. Quote Calculation & Proration Engine ---
  async computeQuote(orgId: string, dto: ComputeQuoteDto) {
    const plan = await this.prisma.saaSPlan.findUnique({
      where: { id: dto.planId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!plan) throw new NotFoundException('Target commercial plan not found');

    const version = dto.planVersionId
      ? await this.prisma.saaSPlanVersion.findUnique({ where: { id: dto.planVersionId } })
      : plan.versions[0];

    if (!version) throw new BadRequestException('No published rate version for this plan');

    const unitPrice = Number(version.priceAmount);
    const seatQuantity = dto.seatQuantity || plan.includedSeats || 5;
    const subtotal = Math.round(unitPrice * seatQuantity * 100) / 100;
    const estimatedTax = Math.round(subtotal * 0.1 * 100) / 100; // Standard estimated 10%
    const totalAmount = Math.round((subtotal + estimatedTax) * 100) / 100;
    const currency = dto.currency || version.currency || 'USD';

    // Proration preview if an active subscription exists
    let proration: any = null;
    const activeSub = await this.prisma.saaSSubscription.findFirst({
      where: {
        organizationId: orgId,
        status: { in: [SaaSSubscriptionStatus.ACTIVE, SaaSSubscriptionStatus.TRIALING] },
      },
      include: { planVersion: true },
    });

    if (activeSub && activeSub.currentPeriodEnd > new Date()) {
      const now = Date.now();
      const periodStart = activeSub.currentPeriodStart.getTime();
      const periodEnd = activeSub.currentPeriodEnd.getTime();
      const totalCycleMs = Math.max(1, periodEnd - periodStart);
      const remainingMs = Math.max(0, periodEnd - now);
      const remainingRatio = remainingMs / totalCycleMs;
      const daysRemaining = Math.ceil(remainingMs / (24 * 3600 * 1000));

      const oldPlanUnitPrice = Number(activeSub.planVersion.priceAmount);
      const oldSubtotal = oldPlanUnitPrice * activeSub.seatQuantity;
      const creditAmount = Math.round(oldSubtotal * remainingRatio * 100) / 100;
      const netPayable = Math.max(0, Math.round((totalAmount - creditAmount) * 100) / 100);

      proration = {
        isProrated: true,
        creditAmount,
        netPayable,
        daysRemaining,
      };
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour validity
    const quotePayload = {
      planId: plan.id,
      planVersionId: version.id,
      planName: plan.name,
      edition: plan.edition,
      interval: plan.billingInterval,
      seatQuantity,
      unitPrice,
      subtotal,
      estimatedTax,
      totalAmount,
      currency,
      proration,
      expiresAt,
    };

    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(JSON.stringify(quotePayload))
      .digest('hex');

    return {
      ...quotePayload,
      signature,
      quoteSignature: signature,
    };
  }

  // --- 3. Checkout Session Creation ---
  async createCheckoutSession(
    orgId: string,
    dto: CreateCheckoutSessionDto,
    _actorId?: string,
  ) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.saaSCheckoutSession.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const customer = await this.getOrCreateCustomer(orgId);
    const quote = await this.computeQuote(orgId, {
      planId: dto.planId,
      planVersionId: dto.planVersionId,
      seatQuantity: dto.seatQuantity,
    });

    const idempotencyKey =
      dto.idempotencyKey || `cs_idem_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const sessionToken = `tok_${crypto.randomBytes(24).toString('hex')}`;
    const finalAmount = quote.proration?.netPayable ?? quote.totalAmount;

    const adapter = this.getAdapter(customer.provider);
    const { sessionId, checkoutUrl } = await adapter.createCheckoutSession({
      customerId: customer.providerCustomerId || undefined,
      amount: finalAmount,
      currency: quote.currency,
      successUrl: dto.successUrl || `http://localhost:3002/settings/billing?checkout=success`,
      cancelUrl: dto.cancelUrl || `http://localhost:3002/settings/billing?checkout=cancel`,
      metadata: {
        organizationId: orgId,
        planId: quote.planId,
        planVersionId: quote.planVersionId,
        seatQuantity: quote.seatQuantity,
      },
    });

    const session = await this.prisma.saaSCheckoutSession.create({
      data: {
        organizationId: orgId,
        customerId: customer.id,
        planId: quote.planId,
        planVersionId: quote.planVersionId,
        idempotencyKey,
        sessionToken,
        providerSessionId: sessionId,
        amountTotal: finalAmount,
        currency: quote.currency,
        seatQuantity: quote.seatQuantity,
        status: CheckoutSessionStatus.OPEN,
        successUrl: checkoutUrl,
        cancelUrl: dto.cancelUrl || `http://localhost:3002/settings/billing`,
        quoteSnapshot: quote,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      include: {
        plan: true,
        planVersion: true,
      },
    });

    // Outbox domain event
    await this.outbox.publish(
      'saas.checkout.created',
      'SaaSCheckoutSession',
      session.id,
      {
        organizationId: orgId,
        sessionId: session.id,
        amountTotal: finalAmount,
        currency: quote.currency,
        planId: quote.planId,
      },
    );

    return {
      ...session,
      sessionId: session.id,
      checkoutUrl,
    };
  }

  // --- 4. Subscription Management ---
  async getSubscription(orgId: string) {
    return this.prisma.saaSSubscription.findFirst({
      where: { organizationId: orgId },
      include: {
        customer: true,
        plan: true,
        planVersion: true,
        terms: { orderBy: { termNumber: 'desc' }, take: 1 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
        dunningRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changeSubscription(
    orgId: string,
    dto: ChangeSubscriptionDto,
    actorId?: string,
  ) {
    const sub = await this.prisma.saaSSubscription.findFirst({
      where: {
        organizationId: orgId,
        status: { in: [SaaSSubscriptionStatus.ACTIVE, SaaSSubscriptionStatus.TRIALING, SaaSSubscriptionStatus.PAST_DUE] },
      },
      include: { plan: true, planVersion: true },
    });

    if (!sub) throw new NotFoundException('No active or trialing subscription found for this workspace');

    // 1. Cancellation scheduling
    if (dto.cancelAtPeriodEnd !== undefined) {
      const updated = await this.prisma.saaSSubscription.update({
        where: { id: sub.id },
        data: {
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
          canceledAt: dto.cancelAtPeriodEnd ? new Date() : null,
        },
      });

      await this.prisma.saaSSubscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: sub.status,
          newStatus: sub.status,
          reason: dto.cancelAtPeriodEnd
            ? 'Scheduled cancellation at end of current period'
            : 'Reactivated recurring subscription auto-renew',
          actorId,
        },
      });

      await this.outbox.publish('saas.subscription.changed', 'SaaSSubscription', sub.id, {
        organizationId: orgId,
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
      });

      return updated;
    }

    // 2. Pause
    if (dto.pause) {
      const updated = await this.prisma.saaSSubscription.update({
        where: { id: sub.id },
        data: { status: SaaSSubscriptionStatus.PAUSED },
      });

      await this.prisma.saaSSubscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: sub.status,
          newStatus: SaaSSubscriptionStatus.PAUSED,
          reason: 'Subscription paused by administrator',
          actorId,
        },
      });

      return updated;
    }

    // 3. Seat expansion/reduction or Plan change
    const targetPlanId = dto.targetPlanId || sub.planId;
    const targetPlanVersionId = dto.targetPlanVersionId || sub.planVersionId;
    const newSeats = dto.seatQuantity || sub.seatQuantity;

    const updated = await this.prisma.saaSSubscription.update({
      where: { id: sub.id },
      data: {
        planId: targetPlanId,
        planVersionId: targetPlanVersionId,
        seatQuantity: newSeats,
      },
      include: { plan: true, planVersion: true },
    });

    // Synchronize OrgEntitlement seat limit
    const entitlement = await this.prisma.orgEntitlement.findFirst({
      where: { organizationId: orgId, planId: sub.planId },
    });

    if (entitlement) {
      await this.prisma.orgEntitlement.update({
        where: { id: entitlement.id },
        data: {
          planId: targetPlanId,
          planVersionId: targetPlanVersionId,
          assignedSeatsLimit: newSeats,
        },
      });
    }

    // Create Term Snapshot
    await this.prisma.saaSSubscriptionTerm.create({
      data: {
        subscriptionId: sub.id,
        termNumber: (sub as any).terms?.length ? (sub as any).terms.length + 1 : 2,
        startDate: sub.currentPeriodStart,
        endDate: sub.currentPeriodEnd,
        seatQuantity: newSeats,
        unitPrice: updated.planVersion.priceAmount,
        totalAmount: Number(updated.planVersion.priceAmount) * newSeats,
        quoteSnapshot: { newSeats, targetPlanId, targetPlanVersionId },
      },
    });

    // Event Audit
    await this.prisma.saaSSubscriptionEvent.create({
      data: {
        subscriptionId: sub.id,
        previousStatus: sub.status,
        newStatus: sub.status,
        reason: `Changed seat allocation to ${newSeats} and plan version to ${targetPlanVersionId}`,
        actorId,
      },
    });

    await this.outbox.publish('saas.subscription.changed', 'SaaSSubscription', sub.id, {
      organizationId: orgId,
      planId: targetPlanId,
      seatQuantity: newSeats,
    });

    return updated;
  }

  async cancelSubscription(orgId: string, immediately = false, actorId?: string) {
    const sub = await this.prisma.saaSSubscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) throw new NotFoundException('Subscription not found');

    if (immediately) {
      const updated = await this.prisma.saaSSubscription.update({
        where: { id: sub.id },
        data: {
          status: SaaSSubscriptionStatus.CANCELLED,
          canceledAt: new Date(),
        },
      });

      await this.prisma.saaSSubscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          previousStatus: sub.status,
          newStatus: SaaSSubscriptionStatus.CANCELLED,
          reason: 'Subscription immediately cancelled by organization admin',
          actorId,
        },
      });

      // Synchronize OrgEntitlement status
      await this.prisma.orgEntitlement.updateMany({
        where: { organizationId: orgId, planId: sub.planId },
        data: { status: EntitlementStatus.CANCELLED },
      });

      await this.outbox.publish('saas.subscription.expired', 'SaaSSubscription', sub.id, {
        organizationId: orgId,
        status: SaaSSubscriptionStatus.CANCELLED,
      });

      return updated;
    } else {
      return this.changeSubscription(orgId, { cancelAtPeriodEnd: true }, actorId);
    }
  }

  // --- 5. Billing Invoices & Receipts ---
  async listInvoices(orgId: string) {
    return this.prisma.saaSInvoice.findMany({
      where: { organizationId: orgId },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(orgId: string, invoiceId: string) {
    const inv = await this.prisma.saaSInvoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { payments: true, customer: true, subscription: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  // --- 6. Payment Methods ---
  async updatePaymentMethod(orgId: string, dto: UpdatePaymentMethodDto) {
    const customer = await this.getOrCreateCustomer(orgId);
    return this.prisma.saaSCustomer.update({
      where: { id: customer.id },
      data: {
        paymentMethodBrand: dto.brand || 'VISA',
        paymentMethodLast4: dto.last4 || '4242',
        paymentMethodExpiry: dto.expiryMonth && dto.expiryYear ? `${dto.expiryMonth}/${dto.expiryYear}` : '12/28',
      },
    });
  }

  // --- 7. Super Admin Operational Telemetry ---
  async getSuperAdminBillingMetrics() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      pastDueSubscriptions,
      invoices,
      recentPayments,
    ] = await Promise.all([
      this.prisma.saaSSubscription.count(),
      this.prisma.saaSSubscription.count({ where: { status: SaaSSubscriptionStatus.ACTIVE } }),
      this.prisma.saaSSubscription.count({ where: { status: SaaSSubscriptionStatus.PAST_DUE } }),
      this.prisma.saaSInvoice.findMany({ select: { totalAmount: true, status: true } }),
      this.prisma.saaSPayment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    const totalRevenue = invoices
      .filter((i) => i.status === SaaSInvoiceStatus.PAID)
      .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    const mrr = invoices
      .filter((i) => i.status === SaaSInvoiceStatus.PAID)
      .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    return {
      metrics: {
        totalSubscriptions,
        activeSubscriptions,
        pastDueSubscriptions,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      recentPayments,
    };
  }
}
