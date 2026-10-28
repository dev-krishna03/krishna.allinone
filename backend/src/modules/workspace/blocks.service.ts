import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { PagesService } from './pages.service';
import { BlockType, PageAccessLevel } from '@prisma/client';
import {
  CreateBlockDto,
  UpdateBlockDto,
  ReorderBlocksDto,
} from '@business-os/types';

const ALLOWED_EMBED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'loom.com',
  'figma.com',
  'github.com',
  'google.com',
  'docs.google.com',
  'miro.com',
];

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
  ) {}

  /**
   * Sanitize block content against XSS and embed hijacking
   */
  private sanitizeContent(blockType: BlockType, content: Record<string, any>): Record<string, any> {
    const sanitized = { ...content };

    // String text sanitization
    if (typeof sanitized.text === 'string') {
      sanitized.text = sanitized.text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onerror\s*=/gi, '')
        .replace(/onload\s*=/gi, '');
    }

    // Embed URL allowlist verification
    if (blockType === BlockType.EMBED && sanitized.url) {
      try {
        const parsed = new URL(sanitized.url);
        const host = parsed.hostname.toLowerCase();
        const isAllowed = ALLOWED_EMBED_DOMAINS.some(
          (d) => host === d || host.endsWith('.' + d),
        );
        if (!isAllowed) {
          throw new BadRequestException(
            `Embed source domain '${host}' is not in the allowed list: ${ALLOWED_EMBED_DOMAINS.join(', ')}`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Invalid embed URL provided');
      }
    }

    return sanitized;
  }

  async listBlocks(orgId: string, pageId: string) {
    return this.prisma.wsPageBlock.findMany({
      where: { pageId, organizationId: orgId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createBlock(orgId: string, pageId: string, dto: CreateBlockDto, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot create blocks');
    }

    const sanitizedContent = this.sanitizeContent(dto.blockType, dto.content || {});

    // Calculate order index
    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined) {
      const lastBlock = await this.prisma.wsPageBlock.findFirst({
        where: { pageId },
        orderBy: { orderIndex: 'desc' },
      });
      orderIndex = (lastBlock?.orderIndex ?? -1) + 1;
    } else {
      // Shift blocks at or after orderIndex
      await this.prisma.wsPageBlock.updateMany({
        where: { pageId, orderIndex: { gte: orderIndex } },
        data: { orderIndex: { increment: 1 } },
      });
    }

    return this.prisma.wsPageBlock.create({
      data: {
        organizationId: orgId,
        pageId,
        parentBlockId: dto.parentBlockId,
        blockType: dto.blockType,
        orderIndex,
        content: sanitizedContent,
        properties: dto.properties || {},
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updateBlock(orgId: string, pageId: string, blockId: string, dto: UpdateBlockDto, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot update blocks');
    }

    const block = await this.prisma.wsPageBlock.findFirst({
      where: { id: blockId, pageId, organizationId: orgId },
    });
    if (!block) throw new NotFoundException('Block not found');

    const blockType = dto.blockType || block.blockType;
    let sanitizedContent = dto.content;
    if (dto.content) {
      sanitizedContent = this.sanitizeContent(blockType, dto.content);
    }

    return this.prisma.wsPageBlock.update({
      where: { id: blockId },
      data: {
        blockType: dto.blockType,
        content: sanitizedContent,
        properties: dto.properties,
        orderIndex: dto.orderIndex,
        updatedById: userId,
      },
    });
  }

  async deleteBlock(orgId: string, pageId: string, blockId: string, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot delete blocks');
    }

    const block = await this.prisma.wsPageBlock.findFirst({
      where: { id: blockId, pageId, organizationId: orgId },
    });
    if (!block) throw new NotFoundException('Block not found');

    await this.prisma.wsPageBlock.delete({
      where: { id: blockId },
    });

    // Reindex remaining blocks
    const remaining = await this.prisma.wsPageBlock.findMany({
      where: { pageId },
      orderBy: { orderIndex: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderIndex !== i) {
        await this.prisma.wsPageBlock.update({
          where: { id: remaining[i].id },
          data: { orderIndex: i },
        });
      }
    }

    return { success: true };
  }

  async reorderBlocks(orgId: string, pageId: string, dto: ReorderBlocksDto, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot reorder blocks');
    }

    for (let i = 0; i < dto.blockIds.length; i++) {
      await this.prisma.wsPageBlock.updateMany({
        where: { id: dto.blockIds[i], pageId, organizationId: orgId },
        data: { orderIndex: i, updatedById: userId },
      });
    }

    return this.listBlocks(orgId, pageId);
  }
}
