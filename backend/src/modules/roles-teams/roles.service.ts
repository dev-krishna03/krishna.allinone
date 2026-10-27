import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { RecordScope } from '@prisma/client';
import { CreateRoleDto, UpdateRoleDto } from '@business-os/types';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async listRoles(orgId: string) {
    const roles = await this.prisma.orgRole.findMany({
      where: { organizationId: orgId },
      include: {
        permissions: {
          include: { permission: true },
        },
        parentRole: { select: { id: true, name: true, code: true } },
        _count: {
          select: { memberRoles: true, permissions: true },
        },
      },
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
    });

    return roles.map((r) => ({
      ...r,
      memberCount: r._count.memberRoles,
      permissionCount: r._count.permissions,
    }));
  }

  async getRole(orgId: string, roleId: string) {
    const role = await this.prisma.orgRole.findFirst({
      where: { id: roleId, organizationId: orgId },
      include: {
        permissions: {
          include: { permission: true },
        },
        parentRole: { select: { id: true, name: true, code: true } },
        childRoles: { select: { id: true, name: true, code: true } },
        _count: { select: { memberRoles: true } },
      },
    });

    if (!role) throw new NotFoundException('Role not found');
    return {
      ...role,
      memberCount: role._count.memberRoles,
    };
  }

  async createRole(orgId: string, dto: CreateRoleDto, actorId?: string) {
    const code = (dto.code || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 50);

    const existing = await this.prisma.orgRole.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Role with code '${code}' already exists in this organization`);
    }

    if (dto.parentRoleId) {
      const parent = await this.prisma.orgRole.findFirst({
        where: { id: dto.parentRoleId, organizationId: orgId },
      });
      if (!parent) throw new BadRequestException('Parent role not found in this organization');
    }

    const role = await this.prisma.orgRole.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        code,
        description: dto.description,
        parentRoleId: dto.parentRoleId || null,
        isBuiltIn: false,
        permissions: dto.permissions
          ? {
              create: dto.permissions.map((p) => ({
                permissionId: p.permissionId,
                recordScope: (p.recordScope as any) || 'ALL',
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    await this.outbox.publish(
      'security.role.created',
      'OrgRole',
      role.id,
      { orgId, roleId: role.id, name: role.name, code: role.code, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'ROLE_CREATED',
        targetType: 'OrgRole',
        targetId: role.id,
        metadata: { roleName: role.name, code: role.code },
      },
    });

    return role;
  }

  async updateRole(orgId: string, roleId: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.prisma.orgRole.findFirst({
      where: { id: roleId, organizationId: orgId },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role.isBuiltIn && dto.name && dto.name !== role.name) {
      // allow updating permissions of built-in roles, but protect name
    }

    if (dto.parentRoleId) {
      if (dto.parentRoleId === roleId) {
        throw new BadRequestException('A role cannot be its own parent');
      }
      const parent = await this.prisma.orgRole.findFirst({
        where: { id: dto.parentRoleId, organizationId: orgId },
      });
      if (!parent) throw new BadRequestException('Parent role not found');
    }

    // If permissions array provided, update them
    if (dto.permissions) {
      await this.prisma.orgRolePermission.deleteMany({
        where: { roleId },
      });

      if (dto.permissions.length > 0) {
        await this.prisma.orgRolePermission.createMany({
          data: dto.permissions.map((p) => ({
            roleId,
            permissionId: p.permissionId,
            recordScope: (p.recordScope as any) || 'ALL',
          })),
        });
      }
    }

    const updated = await this.prisma.orgRole.update({
      where: { id: roleId },
      data: {
        name: dto.name ?? role.name,
        description: dto.description !== undefined ? dto.description : role.description,
        parentRoleId: dto.parentRoleId !== undefined ? dto.parentRoleId : role.parentRoleId,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
        parentRole: { select: { id: true, name: true, code: true } },
      },
    });

    await this.outbox.publish(
      'security.role.updated',
      'OrgRole',
      role.id,
      { orgId, roleId: role.id, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'ROLE_UPDATED',
        targetType: 'OrgRole',
        targetId: role.id,
        metadata: { updates: dto as any },
      },
    });

    return updated;
  }

  async deleteRole(orgId: string, roleId: string, actorId?: string) {
    const role = await this.prisma.orgRole.findFirst({
      where: { id: roleId, organizationId: orgId },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role.isBuiltIn) {
      throw new BadRequestException('Built-in system roles cannot be deleted');
    }

    await this.prisma.orgRole.delete({
      where: { id: roleId },
    });

    await this.outbox.publish(
      'security.role.deleted',
      'OrgRole',
      roleId,
      { orgId, roleId, roleName: role.name, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'ROLE_DELETED',
        targetType: 'OrgRole',
        targetId: roleId,
        metadata: { roleName: role.name },
      },
    });

    return { success: true };
  }

  async assignRoleToMember(
    orgId: string,
    memberId: string,
    roleId: string,
    actorId?: string,
  ) {
    const [member, role] = await Promise.all([
      this.prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId: orgId },
      }),
      this.prisma.orgRole.findFirst({
        where: { id: roleId, organizationId: orgId },
      }),
    ]);

    if (!member) throw new NotFoundException('Member not found');
    if (!role) throw new NotFoundException('Role not found');

    const assignment = await this.prisma.orgMemberRole.upsert({
      where: {
        memberId_roleId: { memberId, roleId },
      },
      create: {
        organizationId: orgId,
        memberId,
        roleId,
      },
      update: {},
    });

    await this.outbox.publish(
      'security.member.role_assigned',
      'OrgMemberRole',
      assignment.id,
      { orgId, memberId, roleId, roleName: role.name, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'MEMBER_ROLE_ASSIGNED',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: { roleId, roleName: role.name },
      },
    });

    return assignment;
  }

  async removeRoleFromMember(
    orgId: string,
    memberId: string,
    roleId: string,
    actorId?: string,
  ) {
    const assignment = await this.prisma.orgMemberRole.findFirst({
      where: { organizationId: orgId, memberId, roleId },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.orgMemberRole.delete({
      where: { id: assignment.id },
    });

    await this.outbox.publish(
      'security.member.role_removed',
      'OrgMemberRole',
      assignment.id,
      { orgId, memberId, roleId, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'MEMBER_ROLE_REMOVED',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: { roleId },
      },
    });

    return { success: true };
  }

  /**
   * Seed standard roles for an organization
   */
  async seedDefaultOrgRoles(orgId: string) {
    const permissions = await this.prisma.platformPermissionRegistry.findMany();
    const permMap = new Map<string, string>();
    for (const p of permissions) {
      permMap.set(`${p.resource}:${p.action}`, p.id);
    }

    const defaultRoleConfigs = [
      {
        name: 'Workspace Administrator',
        code: 'admin',
        isBuiltIn: true,
        description: 'Full administrative access across all workspace applications and settings',
        permissions: permissions.map((p) => ({
          permissionId: p.id,
          recordScope: RecordScope.ALL,
        })),
      },
      {
        name: 'Standard User',
        code: 'standard_user',
        isBuiltIn: true,
        description: 'Standard access to read/write deals, catalog, and standard workspace resources',
        permissions: [
          'catalog:read',
          'crm:read',
          'crm:create',
          'crm:update',
          'billing:read',
          'members:read',
          'security:roles:read',
          'security:teams:read',
        ]
          .map((key): { permissionId: string; recordScope: RecordScope } | null => {
            const [resource, action] = key.split(':');
            const found = permissions.find((p) => p.resource === resource && p.action === action);
            return found ? { permissionId: found.id, recordScope: RecordScope.TEAM } : null;
          })
          .filter((p): p is { permissionId: string; recordScope: RecordScope } => Boolean(p)),
      },
      {
        name: 'Finance Officer',
        code: 'finance_officer',
        isBuiltIn: true,
        description: 'Specialized role for managing invoices, approvals, financial reporting and ledger exports',
        permissions: [
          'invoices:read',
          'invoices:create',
          'invoices:update',
          'invoices:approve',
          'reports:read',
          'sensitive_data:read',
          'export:execute',
          'catalog:read',
        ]
          .map((key): { permissionId: string; recordScope: RecordScope } | null => {
            const [resource, action] = key.split(':');
            const found = permissions.find((p) => p.resource === resource && p.action === action);
            return found ? { permissionId: found.id, recordScope: RecordScope.ALL } : null;
          })
          .filter((p): p is { permissionId: string; recordScope: RecordScope } => Boolean(p)),
      },
      {
        name: 'Auditor & Compliance',
        code: 'auditor',
        isBuiltIn: true,
        description: 'Read-only access to audit logs, compliance evidence, policies, and system activities',
        permissions: [
          'logs:read',
          'logs:export',
          'roles:read',
          'teams:read',
          'policies:read',
          'settings:read',
        ]
          .map((key): { permissionId: string; recordScope: RecordScope } | null => {
            const [resource, action] = key.split(':');
            const found = permissions.find((p) => p.resource === resource && p.action === action);
            return found ? { permissionId: found.id, recordScope: RecordScope.ALL } : null;
          })
          .filter((p): p is { permissionId: string; recordScope: RecordScope } => Boolean(p)),
      },
    ];

    for (const config of defaultRoleConfigs) {
      const existing = await this.prisma.orgRole.findUnique({
        where: {
          organizationId_code: {
            organizationId: orgId,
            code: config.code,
          },
        },
      });

      if (!existing) {
        await this.prisma.orgRole.create({
          data: {
            organizationId: orgId,
            name: config.name,
            code: config.code,
            isBuiltIn: config.isBuiltIn,
            description: config.description,
            permissions: {
              create: config.permissions,
            },
          },
        });
      }
    }
  }
}
