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
import { CreateRevisionDto } from '@business-os/types';

@Injectable()
export class RevisionsService {
  private readonly logger = new Logger(RevisionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
    private readonly outbox: OutboxService,
  ) {}

  async listRevisions(orgId: string, pageId: string) {
    const revisions = await this.prisma.wsPageRevision.findMany({
      where: { pageId, organizationId: orgId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return revisions.map((r) => ({
      ...r,
      createdByName: r.createdBy?.fullName,
      createdByEmail: r.createdBy?.email,
    }));
  }

  async getRevision(orgId: string, pageId: string, version: number) {
    const revision = await this.prisma.wsPageRevision.findFirst({
      where: { pageId, organizationId: orgId, version },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!revision) throw new NotFoundException(`Revision v${version} not found`);

    return {
      ...revision,
      createdByName: revision.createdBy?.fullName,
      createdByEmail: revision.createdBy?.email,
    };
  }

  async createNamedRevision(orgId: string, pageId: string, dto: CreateRevisionDto, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot create checkpoints');
    }

    const page = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
    });
    if (!page) throw new NotFoundException('Page not found');

    const nextVersion = page.currentVersion + 1;

    const revision = await this.prisma.wsPageRevision.create({
      data: {
        organizationId: orgId,
        pageId,
        version: nextVersion,
        title: page.title,
        contentJson: (page.contentJson as any) || {},
        description: dto.description || `Checkpoint v${nextVersion}`,
        isNamed: dto.isNamed ?? true,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.wsPage.update({
      where: { id: pageId },
      data: { currentVersion: nextVersion, updatedById: userId },
    });

    return {
      ...revision,
      createdByName: revision.createdBy?.fullName,
      createdByEmail: revision.createdBy?.email,
    };
  }

  async revertRevision(orgId: string, pageId: string, targetVersion: number, userId: string) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only access: cannot revert revisions');
    }

    const targetRev = await this.prisma.wsPageRevision.findFirst({
      where: { pageId, organizationId: orgId, version: targetVersion },
    });
    if (!targetRev) throw new NotFoundException(`Target version v${targetVersion} not found`);

    const page = await this.prisma.wsPage.findFirst({
      where: { id: pageId, organizationId: orgId },
    });
    if (!page) throw new NotFoundException('Page not found');

    const revertVersion = page.currentVersion + 1;

    // Create a new revision representing the reverted state
    const newRev = await this.prisma.wsPageRevision.create({
      data: {
        organizationId: orgId,
        pageId,
        version: revertVersion,
        title: targetRev.title,
        contentJson: targetRev.contentJson as any,
        description: `Reverted to v${targetVersion}: "${targetRev.description || 'Checkpoint'}"`,
        isNamed: true,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Update active page content
    const updatedPage = await this.prisma.wsPage.update({
      where: { id: pageId },
      data: {
        title: targetRev.title,
        contentJson: targetRev.contentJson as any,
        currentVersion: revertVersion,
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
        action: 'reverted',
        targetVersion,
        newVersion: revertVersion,
        updatedById: userId,
      },
    );

    return {
      success: true,
      page: updatedPage,
      revision: newRev,
    };
  }
}
