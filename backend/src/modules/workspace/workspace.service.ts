import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from '@business-os/types';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or automatically initialize default workspace for organization
   */
  async getOrCreateDefaultWorkspace(orgId: string) {
    let workspace = await this.prisma.wsWorkspace.findFirst({
      where: { organizationId: orgId, isDefault: true },
    });

    if (!workspace) {
      workspace = await this.prisma.wsWorkspace.create({
        data: {
          organizationId: orgId,
          name: 'Main Workspace',
          slug: 'main',
          description: 'Primary collaborative document workspace',
          icon: 'BookOpen',
          isDefault: true,
          settings: {
            allowPublicPublishing: true,
            defaultPermission: 'VIEWER',
          },
        },
      });
      this.logger.log(`Initialized default workspace for org ${orgId}`);
    }

    return workspace;
  }

  async listWorkspaces(orgId: string) {
    // Ensure default exists
    await this.getOrCreateDefaultWorkspace(orgId);

    const workspaces = await this.prisma.wsWorkspace.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            pages: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return workspaces.map((w) => ({
      ...w,
      pageCount: w._count.pages,
    }));
  }

  async getWorkspace(orgId: string, workspaceId: string) {
    const workspace = await this.prisma.wsWorkspace.findFirst({
      where: { id: workspaceId, organizationId: orgId },
      include: {
        _count: {
          select: {
            pages: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    return {
      ...workspace,
      pageCount: workspace._count.pages,
    };
  }

  async createWorkspace(orgId: string, dto: CreateWorkspaceDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.wsWorkspace.findFirst({
      where: { organizationId: orgId, slug },
    });
    if (existing) {
      throw new BadRequestException(`Workspace with slug '${slug}' already exists`);
    }

    return this.prisma.wsWorkspace.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        slug,
        description: dto.description,
        icon: dto.icon || 'BookOpen',
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateWorkspace(orgId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.getWorkspace(orgId, workspaceId);

    return this.prisma.wsWorkspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon,
        settings: dto.settings,
      },
    });
  }
}
