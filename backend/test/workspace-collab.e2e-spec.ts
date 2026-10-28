import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Phase 2.1 - Workspace Editor, Documents and Real-Time Collaboration (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let orgId: string;
  let workspaceId: string;
  let rootPageId: string;
  let childPageId: string;
  let blockId: string;
  let commentId: string;
  let publishedSlug: string;

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
  const ownerEmail = `workspace_owner_${timestamp}@businessos.dev`;

  it('1. Setup Owner user and tenant organization', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        fullName: 'Workspace Document Architect',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify')
      .send({ token: signup.body.verificationToken })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: 'Password123!' })
      .expect(200);

    ownerToken = login.body.tokens.accessToken;

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Acme Engineering ${timestamp}`,
        slug: `acme-eng-${timestamp}`,
      })
      .expect(201);

    orgId = orgRes.body.id;
    expect(orgId).toBeDefined();
  });

  it('2. Automatically initialize and list default workspace', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/workspace`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].isDefault).toBe(true);
    workspaceId = res.body[0].id;
  });

  it('3. Create root page (Engineering Handbook) with v1 checkpoint', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        workspaceId,
        title: 'Engineering Handbook',
        icon: 'BookOpen',
        contentJson: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Welcome to Engineering Handbook' }] }],
        },
      })
      .expect(201);

    rootPageId = res.body.id;
    expect(rootPageId).toBeDefined();
    expect(res.body.depth).toBe(0);
    expect(res.body.currentVersion).toBe(1);
  });

  it('4. Create child subpage (Architecture Decisions) and verify depth calculation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        workspaceId,
        parentId: rootPageId,
        title: 'Architecture Decisions',
        icon: 'Cpu',
      })
      .expect(201);

    childPageId = res.body.id;
    expect(childPageId).toBeDefined();
    expect(res.body.depth).toBe(1);
    expect(res.body.parentId).toBe(rootPageId);
  });

  it('5. Create modular content blocks with XSS sanitization and allowlisted embeds', async () => {
    // 5a. Paragraph with malicious script tag
    const pBlock = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/blocks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        blockType: 'PARAGRAPH',
        content: { text: 'Valid text <script>alert("xss")</script> after' },
      })
      .expect(201);

    blockId = pBlock.body.id;
    expect(pBlock.body.content.text).toBe('Valid text  after');

    // 5b. Allowed YouTube embed
    const embedBlock = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/blocks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        blockType: 'EMBED',
        content: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      })
      .expect(201);

    expect(embedBlock.body.content.url).toContain('youtube.com');

    // 5c. Disallowed embed domain (negative test)
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/blocks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        blockType: 'EMBED',
        content: { url: 'https://untrusted-phishing.org/steal' },
      })
      .expect(400);
  });

  it('6. Cycle prevention on page move: reject moving parent into descendant', async () => {
    // Try to move rootPage into its childPage
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        targetParentId: childPageId,
      })
      .expect(400);

    expect(res.body.message).toContain('Cycle detected');
  });

  it('7. Versioning, named checkpoints and concurrency-safe rollback', async () => {
    // Update content -> creates v2
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Engineering Handbook v2',
        contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated v2' }] }] },
      })
      .expect(200);

    // Create named revision
    const namedRev = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/versions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        description: 'Pre-launch signoff draft',
        isNamed: true,
      })
      .expect(201);

    expect(namedRev.body.isNamed).toBe(true);

    // List revisions
    const revs = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/versions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(revs.body.length).toBeGreaterThanOrEqual(2);

    // Revert to v1
    const revertRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/versions/revert`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ version: 1 })
      .expect(201);

    expect(revertRes.body.success).toBe(true);
    expect(revertRes.body.page.title).toBe('Engineering Handbook');
  });

  it('8. Real-time collaboration token issuance & CRDT snapshot persistence', async () => {
    const tokenRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/collab/token`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(tokenRes.body.token).toBeDefined();
    expect(tokenRes.body.roomId).toBe(`ws:${orgId}:${rootPageId}`);
    expect(tokenRes.body.accessLevel).toBe('OWNER');

    // Save CRDT snapshot
    const snapRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/collab/snapshots`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        snapshotType: 'CHECKPOINT',
        version: 4,
        clientCount: 2,
        metadata: { client: 'tiptap-yjs' },
      })
      .expect(201);

    expect(snapRes.body.id).toBeDefined();
    expect(snapRes.body.snapshotType).toBe('CHECKPOINT');
  });

  it('9. Comments, threads, inline block anchoring and resolution', async () => {
    const commentRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        blockId,
        highlightText: 'Valid text',
        content: 'Please verify the performance implications',
        mentions: [],
      })
      .expect(201);

    commentId = commentRes.body.id;
    expect(commentRes.body.isResolved).toBe(false);

    // Resolve comment
    const resolveRes = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/comments/${commentId}/resolve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isResolved: true })
      .expect(200);

    expect(resolveRes.body.isResolved).toBe(true);
  });

  it('10. Public publishing boundary: private documents hidden, published documents readable', async () => {
    // Unauthenticated access with invalid/private slug -> 404
    await request(app.getHttpServer())
      .get('/api/v1/public/pages/non-existent-private-slug')
      .expect(404);

    // Publish root page
    const pubRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${rootPageId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        isPublished: true,
        publishedSlug: `handbook-${timestamp}`,
      })
      .expect(201);

    publishedSlug = pubRes.body.publishedSlug;
    expect(publishedSlug).toBe(`handbook-${timestamp}`);

    // Public unauthenticated read
    const publicDoc = await request(app.getHttpServer())
      .get(`/api/v1/public/pages/${publishedSlug}`)
      .expect(200);

    expect(publicDoc.body.title).toBe('Engineering Handbook');
  });

  it('11. Trash and restore lifecycle', async () => {
    // Soft delete child page
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // Check it appears in trash
    const trashList = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/workspace/pages?isDeleted=true`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(trashList.body.some((p: any) => p.id === childPageId)).toBe(true);

    // Restore from trash
    const restoreRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/workspace/pages/${childPageId}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(restoreRes.body.isDeleted).toBe(false);
  });
});
