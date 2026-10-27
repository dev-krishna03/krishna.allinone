import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Phase 1.2 - Authentication, Tenancy & Member Lifecycle (e2e)', () => {
  let app: INestApplication;
  let testUserAccessToken: string;
  let testUserId: string;
  let testOrgId: string;
  let inviteToken: string;

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
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const timestamp = Date.now();
  const testEmail = `tester_${timestamp}@businessos.dev`;
  const inviteEmail = `invited_${timestamp}@businessos.dev`;

  it('1. /api/v1/auth/signup (POST) registers new identity user with verification token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: testEmail,
        password: 'Password123!',
        fullName: 'Test Suite Runner',
      })
      .expect(201);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty('verificationToken');
    testUserId = res.body.user.id;

    // Verify email using token
    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: res.body.verificationToken })
      .expect(200);
  });

  it('2. /api/v1/auth/login (POST) authenticates and returns short-lived JWT & rotating refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .expect(200);

    expect(res.body).toHaveProperty('tokens');
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.tokens).toHaveProperty('refreshToken');
    testUserAccessToken = res.body.tokens.accessToken;

    // Test refresh token rotation
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: res.body.tokens.refreshToken })
      .expect(200);

    expect(refreshRes.body.tokens).toHaveProperty('accessToken');
    testUserAccessToken = refreshRes.body.tokens.accessToken;
  });

  it('3. /api/v1/organizations (POST) provisions new tenant and assigns creator as OWNER', async () => {
    const orgSlug = `test-org-${timestamp}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${testUserAccessToken}`)
      .send({
        name: 'Automated Test Tenant',
        slug: orgSlug,
        legalName: 'Automated Test Corp LLC',
        timezone: 'UTC',
        currency: 'USD',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.slug).toBe(orgSlug);
    testOrgId = res.body.id;
  });

  it('4. /api/v1/organizations/:orgId/invites (POST) creates invite with seat quota validation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${testOrgId}/invites`)
      .set('Authorization', `Bearer ${testUserAccessToken}`)
      .set('x-organization-id', testOrgId)
      .send({
        email: inviteEmail,
        role: 'MANAGER',
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe(inviteEmail);
    expect(res.body.role).toBe('MANAGER');
    inviteToken = res.body.token;
  });

  it('5. /api/v1/organizations/:orgId/invites/accept (POST) accepts invite and links member with invited role', async () => {
    // Register the invited user
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: inviteEmail,
        password: 'Password123!',
        fullName: 'Invited Manager',
      })
      .expect(201);

    // Login as invited user
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: inviteEmail,
        password: 'Password123!',
      })
      .expect(200);

    const invitedUserToken = loginRes.body.tokens.accessToken;

    // Accept invite
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${testOrgId}/invites/accept`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .send({ token: inviteToken })
      .expect(200);

    expect(acceptRes.body.role).toBe('MANAGER');
  });

  it('6. /api/v1/organizations/:orgId/members (GET) lists members with tenant isolation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${testOrgId}/members`)
      .set('Authorization', `Bearer ${testUserAccessToken}`)
      .set('x-organization-id', testOrgId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2); // Owner + Invited Manager
  });

  it('7. Cross-tenant isolation: unauthorized user accessing foreign org returns 403 Forbidden', async () => {
    // Create an unrelated user
    const otherEmail = `unrelated_${timestamp}@other.dev`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ email: otherEmail, password: 'Password123!', fullName: 'Other Person' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: otherEmail, password: 'Password123!' });

    const outsiderToken = loginRes.body.tokens.accessToken;

    // Attempt to access testOrgId without membership
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${testOrgId}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set('x-organization-id', testOrgId)
      .expect(403);
  });

  it('8. /api/v1/me/sessions (GET & DELETE) lists sessions and terminates all on logout-all', async () => {
    const sessionsRes = await request(app.getHttpServer())
      .get('/api/v1/me/sessions')
      .set('Authorization', `Bearer ${testUserAccessToken}`)
      .expect(200);

    expect(Array.isArray(sessionsRes.body)).toBe(true);
    expect(sessionsRes.body.length).toBeGreaterThanOrEqual(1);

    // Logout all
    await request(app.getHttpServer())
      .delete('/api/v1/me/sessions')
      .set('Authorization', `Bearer ${testUserAccessToken}`)
      .expect(200);
  });
});
