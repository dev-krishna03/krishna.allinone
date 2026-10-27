import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Phase 1.3 - Granular RBAC, ABAC, Record and Field Security (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let ownerMemberId: string;
  let employeeToken: string;
  let employeeMemberId: string;
  let orgId: string;
  let createdRoleId: string;
  let createdTeamId: string;
  let invoicePermissionId: string;

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
  const ownerEmail = `sec_owner_${timestamp}@businessos.dev`;
  const employeeEmail = `sec_emp_${timestamp}@businessos.dev`;

  it('1. Setup Owner user and organization workspace', async () => {
    // Signup Owner
    const ownerSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        fullName: 'Security Suite Owner',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: ownerSignup.body.verificationToken })
      .expect(200);

    // Login Owner
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: 'Password123!' })
      .expect(200);

    ownerToken = loginRes.body.tokens.accessToken;

    // Create Tenant Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `SecOrg_${timestamp}`,
        slug: `secorg-${timestamp}`,
      })
      .expect(201);

    orgId = orgRes.body.id;

    // Resolve owner membership ID
    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(membersRes.body.length).toBeGreaterThan(0);
    ownerMemberId = membersRes.body[0].id;
  });

  it('2. GET /api/v1/permissions/catalog lists platform canonical permissions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/permissions/catalog')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.total).toBeGreaterThan(10);
    expect(res.body).toHaveProperty('grouped');
    expect(res.body.grouped).toHaveProperty('catalog');
    expect(res.body.grouped).toHaveProperty('billing');

    const invPerm = res.body.permissions.find(
      (p: any) => p.resource === 'invoices' && p.action === 'approve',
    );
    expect(invPerm).toBeDefined();
    invoicePermissionId = invPerm.id;
  });

  it('3. POST /api/v1/organizations/:orgId/roles/seed-defaults initializes standard roles', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/roles/seed-defaults`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(201);

    const rolesRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(rolesRes.body.length).toBeGreaterThanOrEqual(4);
    const adminRole = rolesRes.body.find((r: any) => r.code === 'admin');
    expect(adminRole).toBeDefined();
    expect(adminRole.isBuiltIn).toBe(true);
  });

  it('4. POST /api/v1/organizations/:orgId/roles creates a custom RBAC role with record scopes', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Invoice Approver Senior',
        description: 'Authorized to approve high-value invoices within their team',
        permissions: [
          {
            permissionId: invoicePermissionId,
            recordScope: 'TEAM',
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.code).toBe('invoice_approver_senior');
    expect(res.body.permissions.length).toBe(1);
    createdRoleId = res.body.id;
  });

  it('5. POST /api/v1/organizations/:orgId/teams creates an organizational team', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/teams`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Finance Approvals East',
        leadMemberId: ownerMemberId,
        description: 'Eastern division finance reviews',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.code).toBe('finance_approvals_east');
    createdTeamId = res.body.id;
  });

  it('6. Invite and onboard a secondary Employee member', async () => {
    // Signup Employee
    const empSignup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: employeeEmail,
        password: 'Password123!',
        fullName: 'Jane Employee',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: empSignup.body.verificationToken })
      .expect(200);

    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: employeeEmail, password: 'Password123!' })
      .expect(200);

    employeeToken = empLogin.body.tokens.accessToken;

    // Send Invite from Owner
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        email: employeeEmail,
        role: 'EMPLOYEE',
      })
      .expect(201);

    // Accept Invite as Employee
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/invites/accept`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ token: inviteRes.body.token })
      .expect(200);

    // Get Employee member ID
    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const empMember = membersRes.body.find((m: any) => m.user?.email === employeeEmail);
    expect(empMember).toBeDefined();
    employeeMemberId = empMember.id;
  });

  it('7. Policy Simulator enforces Deny-by-Default for employee without role', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/policy/simulate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        memberId: employeeMemberId,
        resource: 'invoices',
        action: 'approve',
      })
      .expect(201);

    expect(res.body.permit).toBe(false);
    expect(res.body.decision).toBe('DENY');
    expect(res.body.reason).toContain('Deny by default');
  });

  it('8. POST /api/v1/organizations/:orgId/members/:memberId/roles assigns custom role to employee', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/members/${employeeMemberId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ roleId: createdRoleId })
      .expect(201);

    // Also add employee to the team
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/teams/${createdTeamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ memberId: employeeMemberId })
      .expect(201);
  });

  it('9. Policy Simulator now permits action with TEAM scope for employee on their team', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/policy/simulate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        memberId: employeeMemberId,
        resource: 'invoices',
        action: 'approve',
        recordTeamId: createdTeamId,
      })
      .expect(201);

    expect(res.body.permit).toBe(true);
    expect(res.body.decision).toBe('ALLOW');
    expect(res.body.grantedScope).toBe('TEAM');
    expect(res.body.matchedRole).toBe('Invoice Approver Senior');
  });

  it('10. PUT /api/v1/organizations/:orgId/field-policies configures field masking rules', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/organizations/${orgId}/field-policies`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        resourceType: 'invoices',
        fieldName: 'bankAccountNumber',
        policy: 'MASK',
        maskPattern: '***-**-####',
      })
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body.policy).toBe('MASK');

    // Verify in simulator response that field policy is reflected
    const simRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/policy/simulate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        memberId: employeeMemberId,
        resource: 'invoices',
        action: 'read',
      })
      .expect(201);

    expect(simRes.body.fieldPolicies.length).toBeGreaterThan(0);
    const fp = simRes.body.fieldPolicies.find((f: any) => f.fieldName === 'bankAccountNumber');
    expect(fp).toBeDefined();
    expect(fp.policy).toBe('MASK');
  });

  it('11. POST /api/v1/organizations/:orgId/shares creates direct record sharing grant', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/shares`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        resourceType: 'deals',
        recordId: 'deal-vip-777',
        granteeType: 'USER',
        granteeId: employeeMemberId,
        accessLevel: 'READ',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.recordId).toBe('deal-vip-777');

    // List shares
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/shares?resourceType=deals`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it('12. GET /api/v1/organizations/:orgId/security-audit returns security audit events ledger', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/security-audit?limit=20`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(res.body).toHaveProperty('events');
    expect(res.body.total).toBeGreaterThan(0);

    const actions = res.body.events.map((e: any) => e.action);
    expect(actions).toContain('ROLE_CREATED');
    expect(actions).toContain('TEAM_CREATED');
    expect(actions).toContain('MEMBER_ROLE_ASSIGNED');
    expect(actions).toContain('SECURITY_POLICY_SIMULATED');
  });
});
