import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Unified Business OS (e2e)', () => {
  let app: INestApplication;

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

  it('/api/v1/health (GET) returns system health and services status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('database');
  });

  it('/api/v1/platform/config (GET) returns runtime platform configuration', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/platform/config')
      .expect(200);

    expect(res.body.features.multiTenant).toBe(true);
    expect(res.body.features.outboxRelay).toBe(true);
  });

  it('/api/v1/public/products (GET) returns dynamic catalog items', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/products')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('code');
    expect(res.body[0]).toHaveProperty('priceAmount');
  });

  it('/api/v1/public/pricing (GET) returns pricing plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/pricing')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('/api/v1/public/demo-requests (POST) captures marketing lead and queues outbox event', async () => {
    const payload = {
      name: 'Integration Test Lead',
      email: 'integration@testcorp.com',
      companyName: 'TestCorp Global',
      productInterest: 'biz-growth',
      message: 'Automated E2E demo test verification',
      source: 'jest-e2e',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/public/demo-requests')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe('integration@testcorp.com');
    expect(res.body.status).toBe('NEW');
  });

  it('/api/v1/public/demo-requests (POST) rejects invalid requests without required fields', async () => {
    const invalidPayload = {
      name: '',
      email: 'not-an-email',
    };

    await request(app.getHttpServer())
      .post('/api/v1/public/demo-requests')
      .send(invalidPayload)
      .expect(400);
  });

  it('/api/v1/me (GET) returns user and tenant organization context', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('organization');
    expect(res.body).toHaveProperty('permissions');
    expect(res.body.organization.slug).toBe('acme');
  });

  it('/api/v1/admin/overview (GET) returns operational metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .expect(200);

    expect(res.body).toHaveProperty('overview');
    expect(res.body).toHaveProperty('telemetry');
    expect(res.body.systemHealth).toBe('OPERATIONAL');
  });

  it('/api/v1/developer/diagnostics (GET) returns runtime telemetry', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/developer/diagnostics')
      .expect(200);

    expect(res.body).toHaveProperty('runtime');
    expect(res.body).toHaveProperty('outboxQueue');
  });
});
