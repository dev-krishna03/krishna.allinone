import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Phase 1.6 - Super Admin, Developer Console, Integrations and Marketplace (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let orgId: string;
  let incidentId: string;
  let flagId: string;
  let apiKeyId: string;
  let webhookSubId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
  const ownerEmail = `gov_owner_${timestamp}@businessos.dev`;

  it('1. Setup Owner user and tenant organization workspace', async () => {
    const ownerSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        fullName: 'Governance Platform Owner',
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
        name: `GovOrg_${timestamp}`,
        slug: `govorg-${timestamp}`,
      })
      .expect(201);

    orgId = orgRes.body.id;
    expect(orgId).toBeDefined();
  });

  it('2. Super Admin Privacy-Safe Control Plane: Platform tenants and system health', async () => {
    const tenantsRes = await request(app.getHttpServer())
      .get('/api/v1/platform/tenants')
      .expect(200);

    expect(Array.isArray(tenantsRes.body)).toBe(true);
    expect(tenantsRes.body.length).toBeGreaterThan(0);
    const tenant = tenantsRes.body.find((t: any) => t.id === orgId);
    expect(tenant).toBeDefined();
    expect(tenant.slug).toBe(`govorg-${timestamp}`);
    expect(tenant.membersCount).toBeGreaterThanOrEqual(1);

    const healthRes = await request(app.getHttpServer())
      .get('/api/v1/platform/system-health')
      .expect(200);

    expect(['healthy', 'degraded', 'critical']).toContain(healthRes.body.status);
    expect(healthRes.body.services.database.status).toBe('up');
    expect(healthRes.body.metrics.heapUsedMB).toBeGreaterThan(0);
  });

  it('3. Platform Incidents Governance: Declare, list, and resolve an incident', async () => {
    const declareRes = await request(app.getHttpServer())
      .post('/api/v1/platform/incidents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: `Degraded Outbound Email Queue ${timestamp}`,
        description: 'Third-party SMTP provider elevated latency observed.',
        severity: 'MEDIUM',
        affectedServices: ['smtp-worker', 'notifications'],
      })
      .expect(201);

    incidentId = declareRes.body.id;
    expect(incidentId).toBeDefined();
    expect(declareRes.body.status).toBe('OPEN');
    expect(declareRes.body.incidentNumber).toBeDefined();

    // Update incident to RESOLVED
    const resolveRes = await request(app.getHttpServer())
      .patch(`/api/v1/platform/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: 'RESOLVED',
        timelineMessage: 'Upstream SMTP provider mitigated latency. All delivery queues restored.',
      })
      .expect(200);

    expect(resolveRes.body.status).toBe('RESOLVED');
    expect(resolveRes.body.resolvedAt).toBeDefined();
    expect(resolveRes.body.timeline.length).toBeGreaterThanOrEqual(2);
  });

  it('4. Platform Feature Rollouts: Configure and evaluate feature flag targeting', async () => {
    const flagKey = `flag_dark_mode_${timestamp}`;
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/platform/feature-flags')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        flagKey,
        name: 'Dark Mode UI Theme',
        description: 'Enables dark earthy contrast palette',
        isEnabled: true,
        rolloutPercentage: 0,
        targetOrganizationIds: [orgId],
      })
      .expect(201);

    flagId = createRes.body.id;
    expect(flagId).toBeDefined();
    expect(createRes.body.flagKey).toBe(flagKey);

    // Evaluate flag for target organization -> true
    const evalRes1 = await request(app.getHttpServer())
      .get(`/api/v1/platform/feature-flags/${flagKey}/evaluate?organizationId=${orgId}`)
      .expect(200);

    expect(evalRes1.body.isEnabled).toBe(true);
    expect(evalRes1.body.reason).toBe('TARGET_ORGANIZATION');

    // Evaluate flag for arbitrary organization -> false
    const evalRes2 = await request(app.getHttpServer())
      .get(`/api/v1/platform/feature-flags/${flagKey}/evaluate?organizationId=00000000-0000-0000-0000-000000000000`)
      .expect(200);

    expect(evalRes2.body.isEnabled).toBe(false);
  });

  it('5. Developer Console: Queues, durable outbox telemetry, and API key lifecycle', async () => {
    const queuesRes = await request(app.getHttpServer())
      .get('/api/v1/developer/queues')
      .expect(200);

    expect(Array.isArray(queuesRes.body)).toBe(true);
    expect(queuesRes.body.length).toBeGreaterThan(0);
    expect(queuesRes.body[0].counts).toBeDefined();

    const eventsRes = await request(app.getHttpServer())
      .get('/api/v1/developer/events')
      .expect(200);

    expect(Array.isArray(eventsRes.body)).toBe(true);

    // Create Developer API Key
    const keyRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/developer/api-keys`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'CI/CD Pipeline Integration Key',
        scopes: ['read:all', 'write:core'],
        rateLimitPerMin: 120,
        monthlyQuota: 50000,
      })
      .expect(201);

    apiKeyId = keyRes.body.id;
    expect(apiKeyId).toBeDefined();
    expect(keyRes.body.rawKey).toBeDefined();
    expect(keyRes.body.rawKey.startsWith('bos_live_')).toBe(true);
    expect(keyRes.body.keyPrefix.startsWith('bos_live_')).toBe(true);

    // List API keys
    const listKeysRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/developer/api-keys`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(listKeysRes.body.length).toBeGreaterThan(0);
    expect(listKeysRes.body[0].rawKey).toBeUndefined(); // Raw key never persisted in plaintext

    // Revoke API Key
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${orgId}/developer/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);
  });

  it('6. OAuth Vault & Connector Integrations: Connect, CSRF replay prevention, and revoke', async () => {
    // 1. List supported providers
    const providersRes = await request(app.getHttpServer())
      .get('/api/v1/platform/connectors/providers')
      .expect(200);

    expect(Array.isArray(providersRes.body)).toBe(true);
    expect(providersRes.body.length).toBeGreaterThanOrEqual(4);

    // 2. Initiate OAuth flow
    const connectRes = await request(app.getHttpServer())
      .post('/api/v1/integrations/slack/connect')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        organizationId: orgId,
      })
      .expect(201);

    const stateToken = connectRes.body.state;
    expect(stateToken).toBeDefined();
    expect(connectRes.body.authUrl).toContain('slack.com');

    // 3. Handle OAuth callback with code & stateToken
    const callbackRes = await request(app.getHttpServer())
      .post('/api/v1/oauth/slack/callback')
      .send({
        code: 'auth_code_slack_success_mock',
        state: stateToken,
      })
      .expect(201);

    expect(callbackRes.body.success).toBe(true);
    expect(callbackRes.body.status).toBe('CONNECTED');

    // 4. CSRF Replay Prevention: Submitting same stateToken fails with 400
    await request(app.getHttpServer())
      .post('/api/v1/oauth/slack/callback')
      .send({
        code: 'auth_code_slack_replay_attempt',
        state: stateToken,
      })
      .expect(400);

    // 5. Query organization installed connectors
    const orgIntRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/integrations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(orgIntRes.body.length).toBeGreaterThan(0);
    const slackInst = orgIntRes.body.find((i: any) => i.provider.slug === 'slack');
    expect(slackInst).toBeDefined();
    expect(slackInst.status).toBe('CONNECTED');

    // 6. Disconnect integration
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${orgId}/integrations/slack`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);
  });

  it('7. App & Integration Marketplace: Directory, details, and installation', async () => {
    const catalogRes = await request(app.getHttpServer())
      .get('/api/v1/marketplace/listings')
      .expect(200);

    expect(Array.isArray(catalogRes.body)).toBe(true);
    expect(catalogRes.body.length).toBeGreaterThanOrEqual(4);

    const crmApp = catalogRes.body.find((a: any) => a.slug === 'crm-suite');
    expect(crmApp).toBeDefined();
    expect(crmApp.capabilities.length).toBeGreaterThan(0);

    // Install application
    const installRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/marketplace/install/crm-suite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(201);

    expect(installRes.body.success).toBe(true);
    expect(installRes.body.isInstalled).toBe(true);
  });

  it('8. Outbound Webhooks Governance: Subscription, HMAC signing, and test delivery', async () => {
    // 1. Register webhook subscription
    const subRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/webhooks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        targetUrl: 'https://webhook.site/business-os-test',
        subscribedEvents: ['user.*', 'invoice.*'],
      })
      .expect(201);

    webhookSubId = subRes.body.id;
    expect(webhookSubId).toBeDefined();
    expect(subRes.body.secretKey.startsWith('whsec_')).toBe(true);
    expect(subRes.body.status).toBe('ACTIVE');

    // 2. Dispatch signed test ping
    const testRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/webhooks/${webhookSubId}/test`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(201);

    expect(testRes.body.success).toBe(true);
    expect(testRes.body.statusCode).toBe(200);
    expect(testRes.body.deliveryId).toBeDefined();

    // 3. Query delivery attempt logs
    const deliveriesRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/webhooks/${webhookSubId}/deliveries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(Array.isArray(deliveriesRes.body)).toBe(true);
    expect(deliveriesRes.body.length).toBeGreaterThan(0);
    expect(deliveriesRes.body[0].eventType).toBe('webhook.test.ping');
    expect(deliveriesRes.body[0].status).toBe('DELIVERED');
  });
});
