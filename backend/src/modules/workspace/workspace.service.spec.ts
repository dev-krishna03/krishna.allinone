import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';
import { PagesService } from './pages.service';
import { BlocksService } from './blocks.service';
import { CollabService } from './collab.service';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlockType, PageAccessLevel, UserRole } from '@prisma/client';

describe('Workspace & Documents Services', () => {
  let workspaceService: WorkspaceService;
  let pagesService: PagesService;
  let blocksService: BlocksService;
  let collabService: CollabService;

  const mockPrisma = {
    wsWorkspace: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wsPage: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wsPageBlock: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    wsPageRevision: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    wsPagePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    wsPageComment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wsPageFavorite: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    wsPageCollabSnapshot: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(10),
    },
    wsPageCollabEvent: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(5),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    orgTeamMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockOutbox = {
    publish: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('test-jwt-secret-key-must-be-32-chars-long!'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        PagesService,
        BlocksService,
        CollabService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    workspaceService = module.get<WorkspaceService>(WorkspaceService);
    pagesService = module.get<PagesService>(PagesService);
    blocksService = module.get<BlocksService>(BlocksService);
    collabService = module.get<CollabService>(CollabService);
  });

  describe('WorkspaceService', () => {
    it('initializes default workspace if none exists', async () => {
      mockPrisma.wsWorkspace.findFirst.mockResolvedValueOnce(null);
      mockPrisma.wsWorkspace.create.mockResolvedValueOnce({
        id: 'ws-1',
        organizationId: 'org-1',
        name: 'Main Workspace',
        slug: 'main',
        isDefault: true,
      });

      const result = await workspaceService.getOrCreateDefaultWorkspace('org-1');
      expect(result.id).toBe('ws-1');
      expect(mockPrisma.wsWorkspace.create).toHaveBeenCalled();
    });

    it('rejects duplicate slug when creating a workspace', async () => {
      mockPrisma.wsWorkspace.findFirst.mockResolvedValueOnce({ id: 'ws-existing', slug: 'docs' });

      await expect(
        workspaceService.createWorkspace('org-1', { name: 'Docs', slug: 'docs' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PagesService - Cycle Prevention & Hierarchy', () => {
    it('prevents moving a page into itself', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        role: UserRole.OWNER,
        roleAssignments: [],
      });

      await expect(
        pagesService.movePage('org-1', 'page-1', { targetParentId: 'page-1' }, 'user-1'),
      ).rejects.toThrow('Cannot move page into itself');
    });

    it('detects and blocks cycle when moving page into its own descendant', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        role: UserRole.OWNER,
        roleAssignments: [],
      });

      // Target is page-3. Hierarchy: page-3 -> parent is page-2 -> parent is page-1
      mockPrisma.wsPage.findFirst
        .mockResolvedValueOnce({ parentId: 'page-2' }) // page-3's parent
        .mockResolvedValueOnce({ parentId: 'page-1' }); // page-2's parent matches ancestor!

      await expect(
        pagesService.movePage('org-1', 'page-1', { targetParentId: 'page-3' }, 'user-1'),
      ).rejects.toThrow('Cycle detected');
    });

    it('creates page with v1 revision and publishes outbox event', async () => {
      mockPrisma.wsWorkspace.findFirst.mockResolvedValueOnce({ id: 'ws-1' });
      mockPrisma.wsPage.findFirst.mockResolvedValueOnce(null); // last page
      mockPrisma.wsPage.create.mockResolvedValueOnce({
        id: 'new-page-1',
        title: 'Project Roadmap',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        currentVersion: 1,
      });
      mockPrisma.wsPageRevision.create.mockResolvedValueOnce({ id: 'rev-1', version: 1 });
      mockPrisma.wsPageBlock.create.mockResolvedValueOnce({ id: 'block-1' });

      const page = await pagesService.createPage(
        'org-1',
        { title: 'Project Roadmap' },
        'user-1',
      );

      expect(page.id).toBe('new-page-1');
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'workspace.page.created',
        'WorkspacePage',
        'new-page-1',
        expect.objectContaining({ pageId: 'new-page-1', title: 'Project Roadmap' }),
      );
    });
  });

  describe('BlocksService - Content & Embed Sanitization', () => {
    it('sanitizes script tags from block text content', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        role: UserRole.OWNER,
        roleAssignments: [],
      });
      mockPrisma.wsPageBlock.findFirst.mockResolvedValueOnce(null);
      mockPrisma.wsPageBlock.create.mockImplementationOnce(({ data }) => Promise.resolve({ id: 'b1', ...data }));

      const block = await blocksService.createBlock(
        'org-1',
        'page-1',
        {
          blockType: BlockType.PARAGRAPH,
          content: { text: 'Safe text <script>alert("hack")</script> remainder' },
        },
        'user-1',
      );

      expect((block.content as any).text).toBe('Safe text  remainder');
    });

    it('accepts whitelisted embed URL', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        role: UserRole.OWNER,
        roleAssignments: [],
      });
      mockPrisma.wsPageBlock.findFirst.mockResolvedValueOnce(null);
      mockPrisma.wsPageBlock.create.mockImplementationOnce(({ data }) => Promise.resolve({ id: 'b2', ...data }));

      const block = await blocksService.createBlock(
        'org-1',
        'page-1',
        {
          blockType: BlockType.EMBED,
          content: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        },
        'user-1',
      );

      expect((block.content as any).url).toContain('youtube.com');
    });

    it('rejects untrusted/malicious embed domain', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
        role: UserRole.OWNER,
        roleAssignments: [],
      });

      await expect(
        blocksService.createBlock(
          'org-1',
          'page-1',
          {
            blockType: BlockType.EMBED,
            content: { url: 'https://evil-phishing-site.xyz/embed' },
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CollabService - Token & Revocation Check', () => {
    it('generates collab room token with valid membership and access level', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: UserRole.EMPLOYEE,
        roleAssignments: [],
      });
      // Page resolution
      mockPrisma.wsPage.findFirst.mockResolvedValueOnce({
        id: 'page-1',
        createdById: 'user-1', // creator gets OWNER
        parentId: null,
      });
      mockPrisma.wsPageCollabEvent.create.mockResolvedValueOnce({ id: 'evt-1' });

      const res = await collabService.generateCollabToken('org-1', 'page-1', 'user-1');

      expect(res.token).toBeDefined();
      expect(res.roomId).toBe('ws:org-1:page-1');
      expect(res.accessLevel).toBe(PageAccessLevel.OWNER);
    });

    it('rejects collab token validation if user has been removed from organization', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: UserRole.OWNER,
        roleAssignments: [],
      });
      mockPrisma.wsPage.findFirst.mockResolvedValueOnce({
        id: 'page-1',
        createdById: 'user-1',
        parentId: null,
      });
      mockPrisma.wsPageCollabEvent.create.mockResolvedValueOnce({ id: 'evt-1' });

      const { token } = await collabService.generateCollabToken('org-1', 'page-1', 'user-1');

      // Now simulate member revoked
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      await expect(collabService.validateCollabAccess(token)).rejects.toThrow(ForbiddenException);
    });
  });
});
