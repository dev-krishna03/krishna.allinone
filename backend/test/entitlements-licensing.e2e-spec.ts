import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Phase 1.4 - Dynamic Catalog, Plans, Entitlements and Seat Licensing (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let ownerMemberId: string;
  let secondToken: string;
  let secondMemberId: string;
  let orgId: string;
  let customPlanId: string;
  let createdEntitlementId: string;
  let assignedSeatId: string;

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
  const ownerEmail = `catalog_owner_${timestamp}@businessos.dev`;
  const memberEmail = `catalog_member_${timestamp}@businessos.dev`;

  it('1. Setup Owner user and tenant organization workspace', async () => {
    // Signup Owner
    const ownerSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        fullName: 'Catalog Suite Owner',
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
        name: `CatalogOrg_${timestamp}`,
        slug: `catalogorg-${timestamp}`,
      })
      .expect(201);

    orgId = orgRes.body.id;
    expect(orgId).toBeDefined();

    // Query organization members to resolve ownerMemberId
    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(membersRes.body.length).toBeGreaterThan(0);
    ownerMemberId = membersRes.body[0].id;
    expect(ownerMemberId).toBeDefined();
  });

  it('2. Public Pricing endpoint returns published versioned plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/pricing')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const firstPlan = res.body[0];
    expect(firstPlan).toBeDefined();
    expect(firstPlan.name).toBeDefined();
    expect(firstPlan.priceAmount).toBeDefined();
  });

  it('3. Platform Product Catalog lists 14 standard modular apps', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/platform/products')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(14);

    const slugs = res.body.map((p: any) => p.slug);
    expect(slugs).toContain('workspace');
    expect(slugs).toContain('crm');
    expect(slugs).toContain('projects');
    expect(slugs).toContain('finance');
    expect(slugs).toContain('developer');
  });

  it('4. Create commercial plan and publish live via transactional outbox', async () => {
    // 1. Create plan in DRAFT status
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/platform/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Enterprise Growth Plan ${timestamp}`,
        edition: 'GROWTH',
        billingInterval: 'MONTHLY',
        includedSeats: 2, // Limit to 2 seats for testing concurrency/oversell check
        trialDays: 14,
        priceAmount: 99,
        currency: 'USD',
        featureLimits: { maxWorkspaces: 5, apiCallsPerMonth: 50000 },
      })
      .expect(201);

    customPlanId = createRes.body.id;
    expect(customPlanId).toBeDefined();
    expect(createRes.body.status).toBe('DRAFT');

    // 2. Publish plan
    const publishRes = await request(app.getHttpServer())
      .post(`/api/v1/platform/plans/${customPlanId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(publishRes.body.status).toBe('PUBLISHED');
  });

  it('5. Subscribe tenant workspace to custom commercial plan', async () => {
    const subRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/entitlements/subscribe`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        planId: customPlanId,
        assignedSeatsLimit: 2,
      })
      .expect(201);

    createdEntitlementId = subRes.body.id;
    expect(createdEntitlementId).toBeDefined();
    expect(['ACTIVE', 'TRIAL']).toContain(subRes.body.status);
    expect(subRes.body.assignedSeatsLimit).toBe(2);
  });

  it('6. Query active tenant entitlements and verify seat limit indicators', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/entitlements`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const sub = res.body.find((e: any) => e.id === createdEntitlementId);
    expect(sub).toBeDefined();
    expect(sub.assignedSeatsLimit).toBe(2);
  });

  it('7. Onboard secondary member and allocate product seat', async () => {
    // Signup Member
    const memberSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: memberEmail,
        password: 'Password123!',
        fullName: 'Catalog Test Member',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: memberSignup.body.verificationToken })
      .expect(200);

    const memLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'Password123!' })
      .expect(200);

    secondToken = memLogin.body.tokens.accessToken;

    // Invite & add member to org
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        email: memberEmail,
        role: 'EMPLOYEE',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites/accept`)
      .set('Authorization', `Bearer ${secondToken}`)
      .set('x-organization-id', orgId)
      .send({ token: inviteRes.body.token })
      .expect(200);

    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const secondMember = membersRes.body.find((m: any) => m.user?.email === memberEmail);
    expect(secondMember).toBeDefined();
    secondMemberId = secondMember.id;

    // Assign seat 1 to Owner
    const seat1 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/seats/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        entitlementId: createdEntitlementId,
        memberId: ownerMemberId,
      })
      .expect(201);

    expect(seat1.body.status).toBe('ACTIVE');

    // Assign seat 2 to Second Member
    const seat2 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/seats/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        entitlementId: createdEntitlementId,
        memberId: secondMemberId,
      })
      .expect(201);

    assignedSeatId = seat2.body.id;
    expect(seat2.body.status).toBe('ACTIVE');
  });

  it('8. Enforce seat quota limit (attempting to assign beyond limit fails with 409 Conflict)', async () => {
    // Create third user to attempt assigning seat beyond the 2 included seats
    const thirdEmail = `catalog_third_${timestamp}@businessos.dev`;
    const thirdSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: thirdEmail,
        password: 'Password123!',
        fullName: 'Third Excess Member',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: thirdSignup.body.verificationToken })
      .expect(200);

    const thirdLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: thirdEmail, password: 'Password123!' })
      .expect(200);

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        email: thirdEmail,
        role: 'EMPLOYEE',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites/accept`)
      .set('Authorization', `Bearer ${thirdLogin.body.tokens.accessToken}`)
      .set('x-organization-id', orgId)
      .send({ token: inviteRes.body.token })
      .expect(200);

    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const thirdMember = membersRes.body.find((m: any) => m.user?.email === thirdEmail);
    expect(thirdMember).toBeDefined();
    const thirdMemberId = thirdMember.id;

    // Attempting to assign 3rd seat when limit is 2 must strictly fail with 409 Conflict
    const conflictRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/seats/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        entitlementId: createdEntitlementId,
        memberId: thirdMemberId,
      })
      .expect(409);

    expect(conflictRes.body.message).toContain('Seat limit exceeded');
  });

  it('9. Resolve dynamic effective application navigation based on active entitlements', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/entitlements/effective-nav`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(Array.isArray(res.body.availableApps)).toBe(true);
    expect(res.body.availableApps.length).toBeGreaterThanOrEqual(14);

    // Workspace is core and always accessible
    const workspaceApp = res.body.availableApps.find((a: any) => a.slug === 'workspace');
    expect(workspaceApp).toBeDefined();
    expect(workspaceApp.isCore).toBe(true);
    expect(workspaceApp.isEntitled).toBe(true);

    // Dynamic launch URL exists
    expect(workspaceApp.launchUrl).toBeDefined();
  });

  it('10. Record durable metered usage with deduplication by operationId', async () => {
    const opId = `op_meter_e2e_${timestamp}`;

    // First ingestion of usage record
    const record1 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/usage/record`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        featureCode: 'api_calls',
        quantity: 250,
        operationId: opId,
      })
      .expect(201);

    expect(record1.body.status).toBe('RECORDED');
    expect(Number(record1.body.currentUsage)).toBe(250);

    // Duplicate submission with the same operationId should be idempotently ignored
    const record2 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/usage/record`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        featureCode: 'api_calls',
        quantity: 250,
        operationId: opId,
      })
      .expect(201);

    expect(record2.body.status).toBe('DUPLICATE_IGNORED');
    expect(record2.body.operationId).toBe(opId);
  });

  it('11. Seat revocation releases seat back to organization pool', async () => {
    // Revoke assigned seat from member
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${orgId}/seats/${assignedSeatId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    // Now assigning another seat should succeed because count is below limit (1 < 2)
    const reassignRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/seats/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        entitlementId: createdEntitlementId,
        memberId: secondMemberId,
      })
      .expect(201);

    expect(reassignRes.body.status).toBe('ACTIVE');
  });
});
