import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/platform/database/prisma.service';

describe('Phase 1.5 - SaaS Billing, Subscriptions, Invoices and Payment Provider Webhooks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let orgId: string;
  let testPlanId: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const timestamp = Date.now();
  const ownerEmail = `billing_owner_${timestamp}@businessos.dev`;

  it('1. Setup Owner user and tenant organization workspace', async () => {
    const ownerSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        fullName: 'Billing Suite Owner',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: ownerSignup.body.verificationToken })
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: 'Password123!' })
      .expect(200);

    ownerToken = loginRes.body.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `BillingOrg_${timestamp}`,
        slug: `billingorg-${timestamp}`,
      })
      .expect(201);

    orgId = orgRes.body.id;
    expect(orgId).toBeDefined();
  });

  it('2. Ensure published commercial SaaS plan exists in platform plans catalog', async () => {
    const plansRes = await request(app.getHttpServer())
      .get('/api/v1/platform/plans')
      .expect(200);

    expect(Array.isArray(plansRes.body)).toBe(true);
    expect(plansRes.body.length).toBeGreaterThan(0);

    const targetPlan = plansRes.body[0];
    testPlanId = targetPlan.id;

    expect(testPlanId).toBeDefined();
  });

  it('3. Compute signed quote with subtotal, tax, and tamper-proof HMAC signature', async () => {
    const quoteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/billing/quote`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        planId: testPlanId,
        seatQuantity: 10,
      })
      .expect(200);

    expect(quoteRes.body.seatQuantity).toBe(10);
    expect(quoteRes.body.subtotal).toBeGreaterThan(0);
    expect(quoteRes.body.estimatedTax).toBeGreaterThanOrEqual(0);
    expect(quoteRes.body.totalAmount).toBe(
      Math.round((quoteRes.body.subtotal + quoteRes.body.estimatedTax) * 100) / 100,
    );
    expect(quoteRes.body.quoteSignature).toBeDefined();
    expect(quoteRes.body.quoteSignature.length).toBe(64); // SHA-256 hex string
    expect(quoteRes.body.expiresAt).toBeDefined();
  });

  it('4. Create checkout session with idempotency key and session token', async () => {
    const idempotencyKey = `idem_${timestamp}_chk`;
    const checkoutRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/billing/checkout`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        planId: testPlanId,
        seatQuantity: 10,
        idempotencyKey,
        successUrl: 'http://localhost:3002/settings/billing?success=true',
        cancelUrl: 'http://localhost:3002/settings/billing?canceled=true',
      })
      .expect(201);

    expect(checkoutRes.body.sessionId).toBeDefined();
    expect(checkoutRes.body.checkoutUrl).toBeDefined();
    expect(checkoutRes.body.sessionToken).toBeDefined();
    expect(checkoutRes.body.seatQuantity).toBe(10);
    expect(checkoutRes.body.status).toBe('OPEN');

    // Customer record provisioned for tenant
    const customer = await prisma.saaSCustomer.findUnique({
      where: { organizationId: orgId },
    });
    expect(customer).toBeDefined();
    customerId = customer!.providerCustomerId || `cus_stripe_${orgId.replace(/-/g, '').slice(0, 14)}`;
  });

  it('5. Webhook signature rejection: Deny request with invalid signature', async () => {
    const invalidEventId = `evt_tamper_${timestamp}`;
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/billing/stripe')
      .set('stripe-signature', 'invalid_tampered_signature_header')
      .send({
        id: invalidEventId,
        type: 'invoice.paid',
        data: {
          object: {
            id: `in_tamper_${timestamp}`,
            customer: customerId,
          },
        },
      })
      .expect(400);
  });

  it('6. Webhook signature acceptance: Process invoice.paid and activate subscription', async () => {
    const paidEventId = `evt_paid_${timestamp}`;
    const paidInvoiceId = `in_paid_${timestamp}`;

    const webhookRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/billing/stripe')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        id: paidEventId,
        type: 'invoice.paid',
        data: {
          object: {
            id: paidInvoiceId,
            customer: customerId,
            amount_paid: 21890,
            currency: 'usd',
            lines: {
              data: [
                {
                  id: 'il_1',
                  description: 'SaaS Platform Subscription - 10 Seats',
                  amount: 21890,
                },
              ],
            },
            metadata: {
              organizationId: orgId,
              planId: testPlanId,
              seatQuantity: '10',
            },
          },
        },
      })
      .expect(200);

    expect(webhookRes.body.status).toBe('PROCESSED');
    expect(webhookRes.body.eventId).toBe(paidEventId);

    // Verify subscription status is now ACTIVE
    const subRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/billing/subscription`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(subRes.body.status).toBe('ACTIVE');

    // Verify platform SaaS invoice created and marked PAID
    const invoicesRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/billing/invoices`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(invoicesRes.body.length).toBeGreaterThan(0);
    const invoice = invoicesRes.body.find((i: any) => i.providerInvoiceId === paidInvoiceId);
    expect(invoice).toBeDefined();
    expect(invoice.status).toBe('PAID');
    expect(Number(invoice.totalAmount)).toBe(218.9);
  });

  it('7. Webhook deduplication: Re-sending identical event returns ALREADY_PROCESSED', async () => {
    const duplicateEventId = `evt_paid_${timestamp}`;

    const dedupeRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/billing/stripe')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        id: duplicateEventId,
        type: 'invoice.paid',
        data: {
          object: {
            id: `in_paid_${timestamp}`,
            customer: customerId,
            amount_paid: 21890,
          },
        },
      })
      .expect(200);

    expect(dedupeRes.body.status).toBe('ALREADY_PROCESSED');
  });

  it('8. Proration preview when computing quote for active subscription', async () => {
    // Current subscription has 10 seats active, quote 15 seats
    const prorationQuoteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/billing/quote`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        planId: testPlanId,
        seatQuantity: 15,
      })
      .expect(200);

    expect(prorationQuoteRes.body.seatQuantity).toBe(15);
    expect(prorationQuoteRes.body.proration).toBeDefined();
    expect(prorationQuoteRes.body.proration.isProrated).toBe(true);
    expect(prorationQuoteRes.body.proration.creditAmount).toBeGreaterThanOrEqual(0);
  });

  it('9. Webhook payment failed: Triggers PAST_DUE transition and starts dunning run with 7-day grace', async () => {
    const failedEventId = `evt_failed_${timestamp}`;
    const failedInvoiceId = `in_failed_${timestamp}`;

    const failRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/billing/stripe')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        id: failedEventId,
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: failedInvoiceId,
            customer: customerId,
            amount_due: 21890,
            currency: 'usd',
            metadata: {
              organizationId: orgId,
            },
          },
        },
      })
      .expect(200);

    expect(failRes.body.status).toBe('PROCESSED');

    // Verify subscription status is now PAST_DUE with dunning run
    const subRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/billing/subscription`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(subRes.body.status).toBe('PAST_DUE');
    expect(subRes.body.dunningRuns).toBeDefined();
    expect(subRes.body.dunningRuns.length).toBeGreaterThan(0);

    const activeDunning = subRes.body.dunningRuns[0];
    expect(activeDunning.gracePeriodEnd).toBeDefined();
    expect(new Date(activeDunning.gracePeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it('10. Webhook charge refunded: Creates refund record against invoice', async () => {
    const refundEventId = `evt_refund_${timestamp}`;
    const refundRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/billing/stripe')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        id: refundEventId,
        type: 'charge.refunded',
        data: {
          object: {
            id: `ch_ref_${timestamp}`,
            customer: customerId,
            amount_refunded: 5000,
            currency: 'usd',
            metadata: {
              organizationId: orgId,
            },
          },
        },
      })
      .expect(200);

    expect(refundRes.body.status).toBe('PROCESSED');
  });

  it('11. Update payment method: Updates brand and last4 card metadata safely', async () => {
    const updateRes = await request(app.getHttpServer())
      .put(`/api/v1/organizations/${orgId}/billing/payment-method`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        paymentMethodToken: 'pm_card_test_token',
        brand: 'Mastercard',
        last4: '9876',
        expiryMonth: '12',
        expiryYear: '2028',
      })
      .expect(200);

    expect(updateRes.body.paymentMethodBrand).toBe('Mastercard');
    expect(updateRes.body.paymentMethodLast4).toBe('9876');
  });

  it('12. Super Admin telemetry: Query billing overview, MRR and raw webhook log', async () => {
    const overviewRes = await request(app.getHttpServer())
      .get('/api/v1/admin/billing/overview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(overviewRes.body.metrics).toBeDefined();
    expect(overviewRes.body.metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);
    expect(overviewRes.body.metrics.mrr).toBeGreaterThanOrEqual(0);
    expect(overviewRes.body.metrics.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(overviewRes.body.recentPayments).toBeDefined();

    const eventsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/billing/webhook-events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(eventsRes.body)).toBe(true);
    expect(eventsRes.body.length).toBeGreaterThan(0);
    const captured = eventsRes.body.find((e: any) => e.eventId === `evt_paid_${timestamp}`);
    expect(captured).toBeDefined();
    expect(captured.signatureVerified).toBe(true);
    expect(captured.status).toBe('PROCESSED');
  });
});
