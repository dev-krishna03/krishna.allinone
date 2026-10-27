import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { StripeProviderAdapter } from './adapters/stripe-provider.adapter';
import { RazorpayProviderAdapter } from './adapters/razorpay-provider.adapter';
import { DunningService } from './dunning.service';
import {
  ProviderEventStatus,
  SaaSInvoiceStatus,
  SaaSPaymentStatus,
  SaaSSubscriptionStatus,
  EntitlementStatus,
  SaaSRefundStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private readonly webhookSecret = process.env.BILLING_WEBHOOK_SECRET || 'whsec_test_secret_key_123';

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly stripeAdapter: StripeProviderAdapter,
    private readonly razorpayAdapter: RazorpayProviderAdapter,
    private readonly dunningService: DunningService,
  ) {}

  private getAdapter(provider: string) {
    return provider.toUpperCase() === 'RAZORPAY' ? this.razorpayAdapter : this.stripeAdapter;
  }

  async processIncomingWebhook(
    providerName: string,
    rawPayload: string | Buffer,
    signatureHeader: string,
  ) {
    const adapter = this.getAdapter(providerName);
    const isValid = adapter.verifyWebhookSignature(rawPayload, signatureHeader, this.webhookSecret);

    const parsed = adapter.parseWebhookEvent(rawPayload, signatureHeader);
    const { eventId, eventType, data } = parsed;

    // Check deduplication
    const existing = await this.prisma.saaSProviderEvent.findUnique({
      where: { eventId },
    });

    if (existing && existing.status === ProviderEventStatus.PROCESSED) {
      this.logger.log(`Duplicate webhook event ${eventId} ignored`);
      return { status: 'ALREADY_PROCESSED', eventId };
    }

    // Persist raw event
    const record = await this.prisma.saaSProviderEvent.upsert({
      where: { eventId },
      create: {
        provider: providerName.toUpperCase(),
        eventId,
        eventType,
        signatureVerified: isValid,
        status: isValid ? ProviderEventStatus.RECEIVED : ProviderEventStatus.FAILED,
        payload: parsed.rawEvent,
        errorMessage: isValid ? null : 'Invalid HMAC signature',
      },
      update: {
        signatureVerified: isValid,
        errorMessage: isValid ? null : 'Invalid HMAC signature',
      },
    });

    if (!isValid) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    try {
      await this.dispatchStateMachineEvent(providerName, eventType, data);

      await this.prisma.saaSProviderEvent.update({
        where: { id: record.id },
        data: {
          status: ProviderEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return { status: 'PROCESSED', eventId };
    } catch (err: any) {
      this.logger.error(`Error processing webhook ${eventId}: ${err.message}`, err.stack);

      await this.prisma.saaSProviderEvent.update({
        where: { id: record.id },
        data: {
          status: ProviderEventStatus.FAILED,
          errorMessage: err.message,
        },
      });

      throw err;
    }
  }

  private async dispatchStateMachineEvent(provider: string, eventType: string, data: any) {
    this.logger.log(`Dispatching webhook event ${eventType} from ${provider}`);

    // Resolve tenant / customer
    const providerCustomerId = data.customer || data.customerId;
    let customer = providerCustomerId
      ? await this.prisma.saaSCustomer.findFirst({
          where: { providerCustomerId },
          include: { organization: true },
        })
      : null;

    // Fallback: look for organizationId in metadata
    if (!customer && data.metadata?.organizationId) {
      customer = await this.prisma.saaSCustomer.findUnique({
        where: { organizationId: data.metadata.organizationId },
        include: { organization: true },
      });
    }

    if (!customer) {
      this.logger.warn(`Could not correlate customer for event ${eventType}`);
      return;
    }

    const orgId = customer.organizationId;

    switch (eventType) {
      case 'invoice.paid':
      case 'payment.captured':
      case 'checkout.session.completed': {
        const amount = Number(data.amount_paid || data.amount || 4900) / (data.amount_paid ? 100 : 1);
        const currency = (data.currency || 'USD').toUpperCase();
        const invoiceNum = data.number || `INV-SAAS-${Date.now().toString().slice(-6)}`;

        // Locate or create subscription
        let subscription = await this.prisma.saaSSubscription.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
          // Provision default subscription from core plan
          const defaultPlan = await this.prisma.saaSPlan.findFirst({
            include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
          });

          if (defaultPlan && defaultPlan.versions[0]) {
            const now = new Date();
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

            subscription = await this.prisma.saaSSubscription.create({
              data: {
                organizationId: orgId,
                customerId: customer.id,
                planId: defaultPlan.id,
                planVersionId: defaultPlan.versions[0].id,
                status: SaaSSubscriptionStatus.ACTIVE,
                seatQuantity: defaultPlan.includedSeats || 5,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
              },
            });
          }
        }

        if (subscription) {
          // Update status to ACTIVE
          await this.prisma.saaSSubscription.update({
            where: { id: subscription.id },
            data: { status: SaaSSubscriptionStatus.ACTIVE },
          });

          // Ensure OrgEntitlement is in sync
          await this.prisma.orgEntitlement.updateMany({
            where: { organizationId: orgId, planId: subscription.planId },
            data: { status: EntitlementStatus.ACTIVE },
          });

          // Create SaaS Invoice record
          const invoice = await this.prisma.saaSInvoice.create({
            data: {
              organizationId: orgId,
              customerId: customer.id,
              subscriptionId: subscription.id,
              invoiceNumber: invoiceNum,
              providerInvoiceId: data.id,
              status: SaaSInvoiceStatus.PAID,
              subtotalAmount: amount,
              taxAmount: 0,
              totalAmount: amount,
              currency,
              periodStart: subscription.currentPeriodStart,
              periodEnd: subscription.currentPeriodEnd,
              dueDate: new Date(),
              paidAt: new Date(),
              hostedInvoiceUrl: data.hosted_invoice_url || null,
              pdfUrl: data.invoice_pdf || null,
              lineItems: data.lines?.data || [{ description: 'Platform SaaS Subscription', amount }],
            },
          });

          // Create SaaSPayment record
          await this.prisma.saaSPayment.create({
            data: {
              organizationId: orgId,
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              providerPaymentId: data.payment_intent || data.id,
              amount,
              currency,
              status: SaaSPaymentStatus.SUCCEEDED,
              paidAt: new Date(),
            },
          });

          // Recover any in-progress dunning runs
          await this.dunningService.handlePaymentRecovery(subscription.id, invoice.id);

          // Emit outbox event
          await this.outbox.publish('saas.invoice.paid', 'SaaSInvoice', invoice.id, {
            organizationId: orgId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: amount,
            currency,
          });
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'payment.failed': {
        const sub = await this.prisma.saaSSubscription.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        });

        if (sub) {
          const providerInvoiceId = data.id || `inv_${crypto.randomBytes(8).toString('hex')}`;
          let invoice = await this.prisma.saaSInvoice.findFirst({
            where: { providerInvoiceId },
          });

          if (!invoice) {
            const amount = Number(data.amount_due || 4900) / 100;
            const currency = (data.currency || 'USD').toUpperCase();
            invoice = await this.prisma.saaSInvoice.create({
              data: {
                organizationId: orgId,
                customerId: customer.id,
                subscriptionId: sub.id,
                invoiceNumber: data.number || `INV-SAAS-${Date.now().toString().slice(-6)}`,
                providerInvoiceId,
                status: SaaSInvoiceStatus.OPEN,
                subtotalAmount: amount,
                taxAmount: 0,
                totalAmount: amount,
                currency,
                periodStart: sub.currentPeriodStart,
                periodEnd: sub.currentPeriodEnd,
                dueDate: new Date(),
                lineItems: [{ description: 'Platform SaaS Subscription Renewal', amount }],
              },
            });
          } else {
            await this.prisma.saaSInvoice.update({
              where: { id: invoice.id },
              data: { status: SaaSInvoiceStatus.OPEN },
            });
          }

          await this.dunningService.handlePaymentFailure(
            sub.id,
            invoice.id,
            data.last_payment_error?.message || 'Transaction declined by bank',
          );

          await this.outbox.publish('saas.payment.failed', 'SaaSSubscription', sub.id, {
            organizationId: orgId,
            subscriptionId: sub.id,
            invoiceId: invoice.id,
            errorReason: data.last_payment_error?.message,
          });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'subscription.cancelled': {
        const sub = await this.prisma.saaSSubscription.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        });

        if (sub) {
          await this.prisma.saaSSubscription.update({
            where: { id: sub.id },
            data: {
              status: SaaSSubscriptionStatus.CANCELLED,
              canceledAt: new Date(),
            },
          });

          await this.prisma.orgEntitlement.updateMany({
            where: { organizationId: orgId, planId: sub.planId },
            data: { status: EntitlementStatus.CANCELLED },
          });

          await this.outbox.publish('saas.subscription.expired', 'SaaSSubscription', sub.id, {
            organizationId: orgId,
            subscriptionId: sub.id,
          });
        }
        break;
      }

      case 'charge.refunded':
      case 'payment.refunded': {
        const payment = await this.prisma.saaSPayment.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        });

        if (payment) {
          const refundAmount = Number(data.amount_refunded || data.amount || 0) / 100;
          const refund = await this.prisma.saaSRefund.create({
            data: {
              paymentId: payment.id,
              providerRefundId: data.refund_id || data.id,
              amount: refundAmount > 0 ? refundAmount : payment.amount,
              currency: payment.currency,
              reason: data.reason || 'Customer requested refund',
              status: SaaSRefundStatus.SUCCEEDED,
            },
          });

          await this.outbox.publish('saas.refund.confirmed', 'SaaSRefund', refund.id, {
            organizationId: orgId,
            refundId: refund.id,
            paymentId: payment.id,
            amount: Number(refund.amount),
          });
        }
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event type: ${eventType}`);
    }
  }

  async listWebhookEvents(provider?: string) {
    return this.prisma.saaSProviderEvent.findMany({
      where: provider ? { provider: provider.toUpperCase() } : undefined,
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }

  async retryWebhookEvent(eventId: string) {
    const event = await this.prisma.saaSProviderEvent.findUnique({
      where: { eventId },
    });

    if (!event) throw new NotFoundException('Webhook event not found');

    const adapter = this.getAdapter(event.provider);
    const parsed = adapter.parseWebhookEvent(JSON.stringify(event.payload), '');

    await this.dispatchStateMachineEvent(event.provider, parsed.eventType, parsed.data);

    return this.prisma.saaSProviderEvent.update({
      where: { id: event.id },
      data: {
        status: ProviderEventStatus.PROCESSED,
        errorMessage: null,
        processedAt: new Date(),
      },
    });
  }
}
