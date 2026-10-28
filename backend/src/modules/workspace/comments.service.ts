import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { PagesService } from './pages.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { PageAccessLevel } from '@prisma/client';
import { CreateCommentDto } from '@business-os/types';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
    private readonly outbox: OutboxService,
  ) {}

  async listComments(orgId: string, pageId: string) {
    const comments = await this.prisma.wsPageComment.findMany({
      where: {
        pageId,
        organizationId: orgId,
        parentCommentId: null, // top level
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        childComments: {
          include: {
            author: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((c) => ({
      ...c,
      authorName: c.author?.fullName,
      authorEmail: c.author?.email,
      childComments: c.childComments.map((child) => ({
        ...child,
        authorName: child.author?.fullName,
        authorEmail: child.author?.email,
      })),
    }));
  }

  async createComment(orgId: string, pageId: string, dto: CreateCommentDto, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    // Even VIEWER can comment if they have access to the page
    if (!access) {
      throw new ForbiddenException('No access to this page');
    }

    const comment = await this.prisma.wsPageComment.create({
      data: {
        organizationId: orgId,
        pageId,
        parentCommentId: dto.parentCommentId,
        blockId: dto.blockId,
        highlightText: dto.highlightText,
        content: dto.content,
        authorId: userId,
        mentions: dto.mentions || [],
        attachments: dto.attachments || [],
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    // If users were mentioned, trigger outbox event
    if (dto.mentions && dto.mentions.length > 0) {
      await this.outbox.publish(
        'workspace.comment.mentioned',
        'WorkspaceComment',
        comment.id,
        {
          commentId: comment.id,
          pageId,
          organizationId: orgId,
          mentionedUserIds: dto.mentions,
          authorId: userId,
          snippet: dto.content.slice(0, 100),
        },
      );
    }

    return {
      ...comment,
      authorName: comment.author?.fullName,
      authorEmail: comment.author?.email,
    };
  }

  async resolveComment(orgId: string, pageId: string, commentId: string, userId: string, resolve: boolean) {
    const comment = await this.prisma.wsPageComment.findFirst({
      where: { id: commentId, pageId, organizationId: orgId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const updated = await this.prisma.wsPageComment.update({
      where: { id: commentId },
      data: {
        isResolved: resolve,
        resolvedById: resolve ? userId : null,
        resolvedAt: resolve ? new Date() : null,
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      ...updated,
      authorName: updated.author?.fullName,
      authorEmail: updated.author?.email,
    };
  }

  async deleteComment(orgId: string, pageId: string, commentId: string, userId: string) {
    const comment = await this.prisma.wsPageComment.findFirst({
      where: { id: commentId, pageId, organizationId: orgId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (comment.authorId !== userId && access !== PageAccessLevel.OWNER) {
      throw new ForbiddenException('Only the comment author or page owner can delete this comment');
    }

    return this.prisma.wsPageComment.delete({
      where: { id: commentId },
    });
  }
}
