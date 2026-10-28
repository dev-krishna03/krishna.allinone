import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { WorkspaceService } from './workspace.service';
import { PageAccessLevel, PageType, BlockType, UserRole } from '@prisma/client';
import {
  CreatePageDto,
  UpdatePageDto,
  MovePageDto,
  DuplicatePageDto,
  PublishPageDto,
  CreatePermissionDto,
} from '@business-os/types';

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  /**
   * Resolve user's effective access level on a page (OWNER, EDITOR, COMMENTER, VIEWER)
   */
  async resolveUserAccessLevel(orgId: string, pageId: string, userId: string): Promise<PageAccessLevel> {
    // 1. Check organization level role (OWNER / ADMIN get OWNER rights)
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
      include: {
        roleAssignments: { include: { role: true } },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN) {
      return PageAccessLevel.OWNER;
    }

    // 2. Fetch page and creator
    const page = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
      select: { id: true, createdById: true, parentId: true },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.createdById === userId) {
      return PageAccessLevel.OWNER;
    }

    // 3. Check direct page permissions for user
    const directPerm = await this.prisma.wsPagePermission.findFirst({
      where: { pageId, userId },
    });
    if (directPerm) return directPerm.accessLevel;

    // 4. Check role-based permissions
    const userRoleIds = membership.roleAssignments.map((mr) => mr.roleId);
    if (userRoleIds.length > 0) {
      const rolePerm = await this.prisma.wsPagePermission.findFirst({
        where: { pageId, roleId: { in: userRoleIds } },
        orderBy: { accessLevel: 'asc' },
      });
      if (rolePerm) return rolePerm.accessLevel;
    }

    // 5. Check team-based permissions
    const teamMemberships = await this.prisma.orgTeamMember.findMany({
      where: { memberId: membership.id },
      select: { teamId: true },
    });
    const userTeamIds = teamMemberships.map((tm) => tm.teamId);
    if (userTeamIds.length > 0) {
      const teamPerm = await this.prisma.wsPagePermission.findFirst({
        where: { pageId, teamId: { in: userTeamIds } },
        orderBy: { accessLevel: 'asc' },
      });
      if (teamPerm) return teamPerm.accessLevel;
    }

    // 6. Inherit from parent page if present
    if (page.parentId) {
      return this.resolveUserAccessLevel(orgId, page.parentId, userId);
    }

    // 7. Default workspace permission: EDITOR for members, unless restricted
    return PageAccessLevel.EDITOR;
  }

  /**
   * List pages in workspace with hierarchy and filters
   */
  async listPages(
    orgId: string,
    workspaceId?: string,
    filters?: {
      isDeleted?: boolean;
      isTemplate?: boolean;
      templateCategory?: string;
      parentId?: string | null;
      userId?: string;
    },
  ) {
    let wsId = workspaceId;
    if (!wsId) {
      const defaultWs = await this.workspaceService.getOrCreateDefaultWorkspace(orgId);
      wsId = defaultWs.id;
    }

    const where: any = {
      organizationId: orgId,
      workspaceId: wsId,
      isDeleted: filters?.isDeleted ?? false,
    };

    if (filters?.isTemplate !== undefined) {
      where.isTemplate = filters.isTemplate;
    }
    if (filters?.templateCategory) {
      where.templateCategory = filters.templateCategory;
    }
    if (filters?.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    const pages = await this.prisma.wsPage.findMany({
      where,
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            children: { where: { isDeleted: false } },
            comments: { where: { isResolved: false } },
            blocks: true,
          },
        },
      },
    });

    // Check user favorites if userId provided
    let favoritePageIds = new Set<string>();
    if (filters?.userId) {
      const favorites = await this.prisma.wsPageFavorite.findMany({
        where: { organizationId: orgId, userId: filters.userId },
        select: { pageId: true },
      });
      favoritePageIds = new Set(favorites.map((f) => f.pageId));
    }

    return pages.map((page) => ({
      ...page,
      childCount: page._count.children,
      unresolvedCommentCount: page._count.comments,
      blockCount: page._count.blocks,
      isFavorite: favoritePageIds.has(page.id),
    }));
  }

  /**
   * Get single page by ID with verification of user access level
   */
  async getPage(orgId: string, pageId: string, userId?: string) {
    const page = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        workspace: { select: { id: true, name: true, slug: true } },
        parent: { select: { id: true, title: true, icon: true } },
        blocks: {
          orderBy: { orderIndex: 'asc' },
        },
        revisions: {
          orderBy: { version: 'desc' },
          take: 10,
          include: {
            createdBy: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: {
          select: {
            children: { where: { isDeleted: false } },
            comments: { where: { isResolved: false } },
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    let accessLevel: PageAccessLevel = PageAccessLevel.VIEWER;
    let isFavorite = false;

    if (userId) {
      accessLevel = await this.resolveUserAccessLevel(orgId, pageId, userId);
      const fav = await this.prisma.wsPageFavorite.findUnique({
        where: { userId_pageId: { userId, pageId } },
      });
      isFavorite = !!fav;
    }

    return {
      ...page,
      userAccessLevel: accessLevel,
      isFavorite,
    };
  }

  /**
   * Create a new page
   */
  async createPage(orgId: string, dto: CreatePageDto, userId: string) {
    let workspaceId = dto.workspaceId;
    if (!workspaceId) {
      const defaultWs = await this.workspaceService.getOrCreateDefaultWorkspace(orgId);
      workspaceId = defaultWs.id;
    }

    let depth = 0;
    if (dto.parentId) {
      const parent = await this.prisma.wsPage.findFirst({
        where: { id: dto.parentId, organizationId: orgId },
      });
      if (!parent) throw new NotFoundException('Parent page not found');
      depth = parent.depth + 1;
    }

    const lastPage = await this.prisma.wsPage.findFirst({
      where: { organizationId: orgId, workspaceId, parentId: dto.parentId ?? null },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex = (lastPage?.orderIndex ?? -1) + 1;

    const initialContent = dto.contentJson || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start writing, or press "/" for commands...' }],
        },
      ],
    };

    const page = await this.prisma.wsPage.create({
      data: {
        organizationId: orgId,
        workspaceId,
        parentId: dto.parentId,
        title: dto.title || 'Untitled',
        icon: dto.icon || 'FileText',
        coverUrl: dto.coverUrl,
        type: dto.type || PageType.DOCUMENT,
        isTemplate: dto.isTemplate ?? false,
        templateCategory: dto.templateCategory,
        depth,
        orderIndex,
        createdById: userId,
        updatedById: userId,
        currentVersion: 1,
        contentJson: initialContent,
      },
    });

    // Create initial revision
    await this.prisma.wsPageRevision.create({
      data: {
        organizationId: orgId,
        pageId: page.id,
        version: 1,
        title: page.title,
        contentJson: initialContent,
        description: 'Initial creation',
        createdById: userId,
      },
    });

    // Create default paragraph block
    await this.prisma.wsPageBlock.create({
      data: {
        organizationId: orgId,
        pageId: page.id,
        blockType: BlockType.PARAGRAPH,
        orderIndex: 0,
        content: { text: '' },
        createdById: userId,
      },
    });

    // Publish outbox event
    await this.outbox.publish(
      'workspace.page.created',
      'WorkspacePage',
      page.id,
      {
        pageId: page.id,
        organizationId: orgId,
        title: page.title,
        workspaceId,
        parentId: dto.parentId,
        createdById: userId,
      },
    );

    return page;
  }

  /**
   * Update page attributes, content, or metadata
   */
  async updatePage(orgId: string, pageId: string, dto: UpdatePageDto, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('You have read-only access to this page');
    }

    const current = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
    });
    if (!current) throw new NotFoundException('Page not found');

    let nextVersion = current.currentVersion;
    const isContentChanged = dto.contentJson && JSON.stringify(dto.contentJson) !== JSON.stringify(current.contentJson);

    if (isContentChanged) {
      nextVersion = current.currentVersion + 1;
      await this.prisma.wsPageRevision.create({
        data: {
          organizationId: orgId,
          pageId,
          version: nextVersion,
          title: dto.title ?? current.title,
          contentJson: dto.contentJson!,
          description: `Autosaved checkpoint v${nextVersion}`,
          createdById: userId,
        },
      });
    }

    const updated = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        title: dto.title,
        icon: dto.icon,
        coverUrl: dto.coverUrl,
        contentJson: dto.contentJson ?? undefined,
        currentVersion: nextVersion,
        isArchived: dto.isArchived,
        type: dto.type,
        updatedById: userId,
      },
    });

    await this.outbox.publish(
      'workspace.page.updated',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        title: updated.title,
        version: updated.currentVersion,
        updatedById: userId,
      },
    );

    return updated;
  }

  /**
   * Move page in hierarchy with topological cycle detection
   */
  async movePage(orgId: string, pageId: string, dto: MovePageDto, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER && access !== PageAccessLevel.EDITOR) {
      throw new ForbiddenException('Insufficient permissions to move this page');
    }

    const targetParentId = dto.targetParentId || null;

    // 1. Cannot move into itself
    if (targetParentId === pageId) {
      throw new BadRequestException('Cannot move page into itself');
    }

    // 2. Cycle prevention: check if targetParentId is a descendant of pageId
    if (targetParentId) {
      const isDescendant = await this.checkIsDescendant(orgId, pageId, targetParentId);
      if (isDescendant) {
        throw new BadRequestException('Cycle detected: Cannot move a page into one of its descendants');
      }
    }

    // 3. Compute new depth
    let newDepth = 0;
    if (targetParentId) {
      const targetParent = await this.prisma.wsPage.findFirst({
        where: { id: targetParentId, organizationId: orgId },
      });
      if (!targetParent) throw new NotFoundException('Target parent page not found');
      newDepth = targetParent.depth + 1;
    }

    const updated = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        parentId: targetParentId,
        depth: newDepth,
        orderIndex: dto.targetOrderIndex ?? 0,
        updatedById: userId,
      },
    });

    // Recursively adjust depth for descendants
    await this.recalculateDescendantDepths(orgId, pageId, newDepth);

    await this.outbox.publish(
      'workspace.page.updated',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        action: 'moved',
        targetParentId,
        newDepth,
        updatedById: userId,
      },
    );

    return updated;
  }

  private async checkIsDescendant(orgId: string, potentialAncestorId: string, targetId: string): Promise<boolean> {
    let currentId: string | null = targetId;

    while (currentId) {
      if (currentId === potentialAncestorId) {
        return true;
      }
      const page: { parentId: string | null } | null = await this.prisma.wsPage.findFirst({
        where: { id: currentId, organizationId: orgId },
        select: { parentId: true },
      });
      currentId = page?.parentId ?? null;
    }

    return false;
  }

  private async recalculateDescendantDepths(orgId: string, parentId: string, parentDepth: number) {
    const children = await this.prisma.wsPage.findMany({
      where: { parentId, organizationId: orgId },
    });

    for (const child of children) {
      const childDepth = parentDepth + 1;
      await this.prisma.wsPage.update({
        where: { id: child.id },
        data: { depth: childDepth },
      });
      await this.recalculateDescendantDepths(orgId, child.id, childDepth);
    }
  }

  /**
   * Duplicate page and its blocks
   */
  async duplicatePage(orgId: string, pageId: string, dto: DuplicatePageDto, userId: string) {
    const sourcePage = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
      include: {
        blocks: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!sourcePage) throw new NotFoundException('Source page not found');

    const targetParentId = dto.targetParentId !== undefined ? dto.targetParentId : sourcePage.parentId;
    let depth = 0;
    if (targetParentId) {
      const parent = await this.prisma.wsPage.findFirst({
        where: { id: targetParentId, organizationId: orgId },
      });
      if (parent) depth = parent.depth + 1;
    }

    const newPage = await this.prisma.wsPage.create({
      data: {
        organizationId: orgId,
        workspaceId: sourcePage.workspaceId,
        parentId: targetParentId,
        title: `${sourcePage.title} (Copy)`,
        icon: sourcePage.icon,
        coverUrl: sourcePage.coverUrl,
        type: sourcePage.type,
        depth,
        orderIndex: sourcePage.orderIndex + 1,
        createdById: userId,
        updatedById: userId,
        contentJson: sourcePage.contentJson as any,
      },
    });

    // Duplicate blocks
    for (const block of sourcePage.blocks) {
      await this.prisma.wsPageBlock.create({
        data: {
          organizationId: orgId,
          pageId: newPage.id,
          blockType: block.blockType,
          orderIndex: block.orderIndex,
          content: block.content as any,
          properties: block.properties as any,
          createdById: userId,
        },
      });
    }

    // Initial revision
    await this.prisma.wsPageRevision.create({
      data: {
        organizationId: orgId,
        pageId: newPage.id,
        version: 1,
        title: newPage.title,
        contentJson: (sourcePage.contentJson as any) || {},
        description: `Duplicated from ${sourcePage.title}`,
        createdById: userId,
      },
    });

    await this.outbox.publish(
      'workspace.page.created',
      'WorkspacePage',
      newPage.id,
      {
        pageId: newPage.id,
        organizationId: orgId,
        duplicatedFromId: sourcePage.id,
        createdById: userId,
      },
    );

    return newPage;
  }

  /**
   * Soft delete (move to trash)
   */
  async softDeletePage(orgId: string, pageId: string, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER && access !== PageAccessLevel.EDITOR) {
      throw new ForbiddenException('Only owners or editors can delete this page');
    }

    const updated = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    await this.outbox.publish(
      'workspace.page.updated',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        action: 'moved_to_trash',
        deletedById: userId,
      },
    );

    return updated;
  }

  /**
   * Restore from trash
   */
  async restorePage(orgId: string, pageId: string, userId: string) {
    const page = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
    });
    if (!page) throw new NotFoundException('Page not found');

    const updated = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });

    await this.outbox.publish(
      'workspace.page.restored',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        restoredById: userId,
      },
    );

    return updated;
  }

  /**
   * Permanently delete
   */
  async permanentlyDeletePage(orgId: string, pageId: string, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER) {
      throw new ForbiddenException('Only owners can permanently delete a page');
    }

    return this.prisma.wsPage.delete({
      where: { id: pageId },
    });
  }

  /**
   * Toggle user favorite
   */
  async toggleFavorite(orgId: string, pageId: string, userId: string) {
    const existing = await this.prisma.wsPageFavorite.findUnique({
      where: { userId_pageId: { userId, pageId } },
    });

    if (existing) {
      await this.prisma.wsPageFavorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    } else {
      const page = await this.prisma.wsPage.findFirst({
        where: { id: pageId, organizationId: orgId },
      });
      if (!page) throw new NotFoundException('Page not found');

      await this.prisma.wsPageFavorite.create({
        data: {
          organizationId: orgId,
          workspaceId: page.workspaceId,
          pageId,
          userId,
        },
      });
      return { isFavorite: true };
    }
  }

  /**
   * Publish or unpublish page to public web boundary
   */
  async publishPage(orgId: string, pageId: string, dto: PublishPageDto, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER) {
      throw new ForbiddenException('Only page owners can publish pages to the public web');
    }

    let slug = dto.publishedSlug;
    if (dto.isPublished && !slug) {
      const page = await this.prisma.wsPage.findUnique({ where: { id: pageId } });
      const baseSlug = (page?.title || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      slug = `${baseSlug}-${pageId.slice(0, 8)}`;
    }

    const updated = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        isPublished: dto.isPublished,
        publishedSlug: dto.isPublished ? slug : null,
      },
    });

    await this.outbox.publish(
      'workspace.page.updated',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        action: dto.isPublished ? 'published' : 'unpublished',
        publishedSlug: updated.publishedSlug,
        updatedById: userId,
      },
    );

    return updated;
  }

  /**
   * Public internet view - strictly checks isPublished and isDeleted
   */
  async getPublicPage(publishedSlug: string) {
    const page = await this.prisma.wsPage.findFirst({
      where: {
        publishedSlug,
        isPublished: true,
        isDeleted: false,
      },
      include: {
        blocks: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!page) {
      throw new NotFoundException('Published document not found or access is private');
    }

    return {
      title: page.title,
      icon: page.icon,
      coverUrl: page.coverUrl,
      contentJson: page.contentJson,
      blocks: page.blocks,
      updatedAt: page.updatedAt,
    };
  }

  /**
   * Share / Permissions management
   */
  async listPermissions(orgId: string, pageId: string, userId: string) {
    await this.resolveUserAccessLevel(orgId, pageId, userId);

    const permissions = await this.prisma.wsPagePermission.findMany({
      where: { pageId, organizationId: orgId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return permissions.map((p) => ({
      ...p,
      userName: p.user?.fullName,
      userEmail: p.user?.email,
      roleName: p.role?.name,
      teamName: p.team?.name,
    }));
  }

  async grantPermission(orgId: string, pageId: string, dto: CreatePermissionDto, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER) {
      throw new ForbiddenException('Only page owners can grant access permissions');
    }

    const permission = await this.prisma.wsPagePermission.create({
      data: {
        organizationId: orgId,
        pageId,
        userId: dto.userId,
        roleId: dto.roleId,
        teamId: dto.teamId,
        accessLevel: dto.accessLevel,
        grantedById: userId,
      },
    });

    await this.outbox.publish(
      'workspace.page.shared',
      'WorkspacePage',
      pageId,
      {
        pageId,
        organizationId: orgId,
        targetUserId: dto.userId,
        targetRoleId: dto.roleId,
        targetTeamId: dto.teamId,
        accessLevel: dto.accessLevel,
        grantedById: userId,
      },
    );

    return permission;
  }

  async revokePermission(orgId: string, pageId: string, permissionId: string, userId: string) {
    const access = await this.resolveUserAccessLevel(orgId, pageId, userId);
    if (access !== PageAccessLevel.OWNER) {
      throw new ForbiddenException('Only page owners can revoke access permissions');
    }

    return this.prisma.wsPagePermission.delete({
      where: { id: permissionId },
    });
  }
}
