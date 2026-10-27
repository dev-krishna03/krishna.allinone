import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import {
  RecordScope,
  GranteeType,
  AccessLevel,
  FieldPolicyType,
  PermissionSensitivity,
} from '@prisma/client';
import {
  PolicySimulationRequest,
  PolicySimulationResult,
  EffectiveAccessSummary,
  CreateRecordGrantDto,
  UpsertFieldPolicyDto,
} from '@business-os/types';

export interface EvaluateAccessParams {
  orgId: string;
  memberId: string;
  action: string;
  resource: string;
  module?: string;
  recordId?: string;
  recordOwnerId?: string;
  recordTeamId?: string;
  recordDepartmentId?: string;
}

@Injectable()
export class PolicyDecisionService {
  private readonly logger = new Logger(PolicyDecisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Deny-by-default access evaluation engine with RBAC, ABAC, role hierarchy and record scopes.
   */
  async evaluateAccess(params: EvaluateAccessParams): Promise<PolicySimulationResult> {
    const {
      orgId,
      memberId,
      action,
      resource,
      module,
      recordId,
      recordOwnerId,
      recordTeamId,
      recordDepartmentId,
    } = params;

    const evaluatedAt = new Date().toISOString();

    // 1. Fetch organization member
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: true,
        user: true,
        teamMemberships: {
          include: {
            team: {
              include: {
                parentTeam: true,
                childTeams: true,
              },
            },
          },
        },
        roleAssignments: {
          include: {
            role: {
              include: {
                parentRole: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!member || member.organizationId !== orgId) {
      return {
        permit: false,
        decision: 'DENY',
        reason: 'Deny: Member not found in organization',
        evaluatedAt,
      };
    }

    if (member.status !== 'ACTIVE' || member.organization.status !== 'ACTIVE') {
      return {
        permit: false,
        decision: 'DENY',
        reason: `Deny: Member status is ${member.status} or organization is ${member.organization.status}`,
        evaluatedAt,
      };
    }

    // 2. Organization OWNER bypass / full administrative grant
    if (member.role === 'OWNER') {
      const fieldPolicies = await this.resolveFieldPolicies(orgId, [], resource);
      return {
        permit: true,
        decision: 'ALLOW',
        reason: 'Allow: Member holds Organization OWNER tier',
        matchedRole: 'Owner',
        grantedScope: 'ALL' as any,
        effectiveAccessLevel: 'ADMIN' as any,
        fieldPolicies,
        evaluatedAt,
      };
    }

    const memberTeamIds = member.teamMemberships.map((tm) => tm.teamId);
    const memberDepartmentIds = member.teamMemberships.flatMap((tm) => [
      tm.teamId,
      tm.team.parentTeamId,
      ...tm.team.childTeams.map((ct) => ct.id),
    ]).filter((id): id is string => Boolean(id));

    // 3. Resolve member's roles and permissions (including inherited from parentRole)
    const effectivePermissions: {
      roleName: string;
      roleId: string;
      permission: {
        id: string;
        module: string;
        resource: string;
        action: string;
        sensitivity: PermissionSensitivity;
      };
      recordScope: RecordScope;
    }[] = [];

    const memberRoleIds: string[] = [];

    for (const assignment of member.roleAssignments) {
      const role = assignment.role;
      memberRoleIds.push(role.id);

      // Current role permissions
      for (const rp of role.permissions) {
        effectivePermissions.push({
          roleName: role.name,
          roleId: role.id,
          permission: rp.permission,
          recordScope: rp.recordScope,
        });
      }

      // Inherited permissions from parent role (Zoho-style hierarchy)
      if (role.parentRole) {
        for (const prp of role.parentRole.permissions) {
          effectivePermissions.push({
            roleName: `${role.name} (inherited from ${role.parentRole.name})`,
            roleId: role.id,
            permission: prp.permission,
            recordScope: prp.recordScope,
          });
        }
      }
    }

    // If member has standard system ADMIN role but no custom role permissions configured,
    // give default administrative permissions
    if (member.role === 'ADMIN' && effectivePermissions.length === 0) {
      const fieldPolicies = await this.resolveFieldPolicies(orgId, memberRoleIds, resource);
      return {
        permit: true,
        decision: 'ALLOW',
        reason: 'Allow: Standard workspace administrator authorization',
        matchedRole: 'Admin',
        grantedScope: 'ALL' as any,
        effectiveAccessLevel: 'ADMIN' as any,
        fieldPolicies,
        evaluatedAt,
      };
    }

    // 4. Look for matching permission
    const matching = effectivePermissions.find((ep) => {
      const resourceMatch = ep.permission.resource.toLowerCase() === resource.toLowerCase();
      const actionMatch = ep.permission.action.toLowerCase() === action.toLowerCase();
      const moduleMatch = module
        ? ep.permission.module.toLowerCase() === module.toLowerCase()
        : true;
      return resourceMatch && actionMatch && moduleMatch;
    });

    const fieldPolicies = await this.resolveFieldPolicies(orgId, memberRoleIds, resource);

    if (matching) {
      // Evaluate record scope
      const scope = matching.recordScope;

      if (scope === RecordScope.ALL) {
        return {
          permit: true,
          decision: 'ALLOW',
          reason: `Allow: Permitted by role "${matching.roleName}" with org-wide (ALL) scope`,
          matchedRole: matching.roleName,
          grantedScope: scope as any,
          effectiveAccessLevel: action === 'read' ? 'READ' : action === 'delete' ? 'ADMIN' : 'WRITE',
          fieldPolicies,
          evaluatedAt,
        };
      }

      if (scope === RecordScope.OWNER_ONLY) {
        if (!recordOwnerId || recordOwnerId === memberId) {
          return {
            permit: true,
            decision: 'ALLOW',
            reason: `Allow: Permitted by role "${matching.roleName}" under OWNER_ONLY scope`,
            matchedRole: matching.roleName,
            grantedScope: scope as any,
            effectiveAccessLevel: action === 'read' ? 'READ' : 'WRITE',
            fieldPolicies,
            evaluatedAt,
          };
        }
      }

      if (scope === RecordScope.TEAM) {
        if (!recordTeamId || memberTeamIds.includes(recordTeamId)) {
          return {
            permit: true,
            decision: 'ALLOW',
            reason: `Allow: Permitted by role "${matching.roleName}" under TEAM scope`,
            matchedRole: matching.roleName,
            grantedScope: scope as any,
            effectiveAccessLevel: action === 'read' ? 'READ' : 'WRITE',
            fieldPolicies,
            evaluatedAt,
          };
        }
      }

      if (scope === RecordScope.DEPARTMENT) {
        if (!recordDepartmentId || memberDepartmentIds.includes(recordDepartmentId)) {
          return {
            permit: true,
            decision: 'ALLOW',
            reason: `Allow: Permitted by role "${matching.roleName}" under DEPARTMENT scope`,
            matchedRole: matching.roleName,
            grantedScope: scope as any,
            effectiveAccessLevel: action === 'read' ? 'READ' : 'WRITE',
            fieldPolicies,
            evaluatedAt,
          };
        }
      }
    }

    // 5. Check direct record-level access grants (ABAC / Direct Sharing)
    if (recordId) {
      const grant = await this.prisma.recordAccessGrant.findFirst({
        where: {
          organizationId: orgId,
          resourceType: resource,
          recordId,
          OR: [
            { granteeType: GranteeType.USER, granteeId: memberId },
            { granteeType: GranteeType.TEAM, granteeId: { in: memberTeamIds } },
          ],
        },
      });

      if (grant) {
        const canRead = ['READ', 'WRITE', 'ADMIN'].includes(grant.accessLevel);
        const canWrite = ['WRITE', 'ADMIN'].includes(grant.accessLevel);
        const canAdmin = grant.accessLevel === 'ADMIN';

        let grantPermit = false;
        if (action === 'read' && canRead) grantPermit = true;
        if (['create', 'update', 'write'].includes(action) && canWrite) grantPermit = true;
        if (['delete', 'approve'].includes(action) && canAdmin) grantPermit = true;

        if (grantPermit) {
          return {
            permit: true,
            decision: 'ALLOW',
            reason: `Allow: Direct record access grant (${grant.accessLevel}) awarded to ${grant.granteeType.toLowerCase()}`,
            grantedScope: 'OWNER_ONLY' as any,
            effectiveAccessLevel: grant.accessLevel as any,
            fieldPolicies,
            evaluatedAt,
          };
        }
      }
    }

    // 6. Deny by default
    return {
      permit: false,
      decision: 'DENY',
      reason: `Deny by default: No role permission or direct grant authorizes action "${action}" on resource "${resource}"`,
      fieldPolicies,
      evaluatedAt,
    };
  }

  /**
   * Resolve field masking and redaction policies for given roles on a resource
   */
  async resolveFieldPolicies(
    orgId: string,
    roleIds: string[],
    resourceType: string,
  ): Promise<{ fieldName: string; policy: FieldPolicyType; maskPattern: string | null }[]> {
    const policies = await this.prisma.orgFieldPolicy.findMany({
      where: {
        organizationId: orgId,
        resourceType,
        OR: [{ roleId: null }, { roleId: { in: roleIds } }],
      },
    });

    const fieldMap = new Map<string, { fieldName: string; policy: FieldPolicyType; maskPattern: string | null }>();

    // Organization defaults first
    for (const pol of policies.filter((p) => p.roleId === null)) {
      fieldMap.set(pol.fieldName, {
        fieldName: pol.fieldName,
        policy: pol.policy,
        maskPattern: pol.maskPattern,
      });
    }

    // Role-specific policies override defaults
    for (const pol of policies.filter((p) => p.roleId !== null)) {
      fieldMap.set(pol.fieldName, {
        fieldName: pol.fieldName,
        policy: pol.policy,
        maskPattern: pol.maskPattern,
      });
    }

    return Array.from(fieldMap.values());
  }

  /**
   * Interactive Policy Simulator
   */
  async simulateAccess(
    orgId: string,
    request: PolicySimulationRequest,
  ): Promise<PolicySimulationResult> {
    const result = await this.evaluateAccess({
      orgId,
      memberId: request.memberId,
      action: request.action,
      resource: request.resource,
      module: request.module,
      recordOwnerId: request.recordOwnerId,
      recordTeamId: request.recordTeamId,
      recordDepartmentId: request.recordDepartmentId,
    });

    // Record simulation event for security audit
    await this.logSecurityEvent(
      orgId,
      request.memberId,
      'SECURITY_POLICY_SIMULATED',
      'SIMULATION',
      request.resource,
      { request, result },
    );

    return result;
  }

  /**
   * Return comprehensive effective access summary for a member
   */
  async getEffectiveAccessSummary(
    orgId: string,
    memberId: string,
  ): Promise<EffectiveAccessSummary> {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        teamMemberships: {
          include: {
            team: true,
          },
        },
        ledTeams: true,
      },
    });

    if (!member || member.organizationId !== orgId) {
      throw new NotFoundException('Organization member not found');
    }

    const fieldPolicies = await this.prisma.orgFieldPolicy.findMany({
      where: { organizationId: orgId },
    });

    const roles = member.roleAssignments.map((ra) => ({
      id: ra.role.id,
      name: ra.role.name,
      code: ra.role.code,
      permissions: ra.role.permissions.map((p) => ({
        permissionId: p.permissionId,
        module: p.permission.module,
        resource: p.permission.resource,
        action: p.permission.action,
        sensitivity: p.permission.sensitivity,
        recordScope: p.recordScope,
      })),
    }));

    const teams = member.teamMemberships.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      code: tm.team.code,
      isLead: member.ledTeams.some((lt) => lt.id === tm.team.id),
    }));

    return {
      memberId,
      roles,
      teams,
      fieldPolicies: fieldPolicies as any,
    };
  }

  /**
   * Field Policies CRUD
   */
  async listFieldPolicies(orgId: string, resourceType?: string) {
    return this.prisma.orgFieldPolicy.findMany({
      where: {
        organizationId: orgId,
        ...(resourceType ? { resourceType } : {}),
      },
      include: {
        role: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ resourceType: 'asc' }, { fieldName: 'asc' }],
    });
  }

  async upsertFieldPolicy(
    orgId: string,
    dto: UpsertFieldPolicyDto,
    actorId?: string,
  ) {
    const existing = await this.prisma.orgFieldPolicy.findFirst({
      where: {
        organizationId: orgId,
        roleId: dto.roleId ?? null,
        resourceType: dto.resourceType,
        fieldName: dto.fieldName,
      },
    });

    let policy;
    if (existing) {
      policy = await this.prisma.orgFieldPolicy.update({
        where: { id: existing.id },
        data: {
          policy: dto.policy,
          maskPattern: dto.maskPattern || 'REDACTED',
        },
      });
    } else {
      policy = await this.prisma.orgFieldPolicy.create({
        data: {
          organizationId: orgId,
          roleId: dto.roleId ?? null,
          resourceType: dto.resourceType,
          fieldName: dto.fieldName,
          policy: dto.policy,
          maskPattern: dto.maskPattern || 'REDACTED',
        },
      });
    }

    await this.incrementPolicyVersion(orgId, actorId);

    await this.outbox.publish(
      'security.field_policy.updated',
      'OrgFieldPolicy',
      policy.id,
      { orgId, policyId: policy.id, resourceType: dto.resourceType, fieldName: dto.fieldName },
    );

    await this.logSecurityEvent(
      orgId,
      actorId,
      'FIELD_POLICY_UPSERTED',
      'OrgFieldPolicy',
      policy.id,
      dto as any,
    );

    return policy;
  }

  async deleteFieldPolicy(orgId: string, policyId: string, actorId?: string) {
    const policy = await this.prisma.orgFieldPolicy.findFirst({
      where: { id: policyId, organizationId: orgId },
    });
    if (!policy) throw new NotFoundException('Field policy not found');

    await this.prisma.orgFieldPolicy.delete({ where: { id: policyId } });
    await this.incrementPolicyVersion(orgId, actorId);

    await this.logSecurityEvent(
      orgId,
      actorId,
      'FIELD_POLICY_DELETED',
      'OrgFieldPolicy',
      policyId,
      { policy },
    );

    return { success: true };
  }

  /**
   * Direct Record Sharing Grants (ABAC)
   */
  async listRecordGrants(orgId: string, resourceType?: string, recordId?: string) {
    return this.prisma.recordAccessGrant.findMany({
      where: {
        organizationId: orgId,
        ...(resourceType ? { resourceType } : {}),
        ...(recordId ? { recordId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecordGrant(
    orgId: string,
    dto: CreateRecordGrantDto,
    actorId?: string,
  ) {
    const grant = await this.prisma.recordAccessGrant.create({
      data: {
        organizationId: orgId,
        resourceType: dto.resourceType,
        recordId: dto.recordId,
        granteeType: dto.granteeType,
        granteeId: dto.granteeId,
        accessLevel: dto.accessLevel,
      },
    });

    await this.logSecurityEvent(
      orgId,
      actorId,
      'RECORD_ACCESS_GRANTED',
      dto.resourceType,
      dto.recordId,
      { grant },
    );

    return grant;
  }

  async deleteRecordGrant(orgId: string, grantId: string, actorId?: string) {
    const grant = await this.prisma.recordAccessGrant.findFirst({
      where: { id: grantId, organizationId: orgId },
    });
    if (!grant) throw new NotFoundException('Record access grant not found');

    await this.prisma.recordAccessGrant.delete({ where: { id: grantId } });

    await this.logSecurityEvent(
      orgId,
      actorId,
      'RECORD_ACCESS_REVOKED',
      grant.resourceType,
      grant.recordId,
      { grant },
    );

    return { success: true };
  }

  /**
   * Security Audit Log
   */
  async listSecurityAuditEvents(orgId: string, limit = 50, offset = 0) {
    const [events, total] = await Promise.all([
      this.prisma.securityAuditEvent.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.securityAuditEvent.count({
        where: { organizationId: orgId },
      }),
    ]);

    return { events, total, limit, offset };
  }

  private async incrementPolicyVersion(orgId: string, actorId?: string) {
    await this.prisma.accessPolicyVersion.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, version: 1, updatedBy: actorId },
      update: { version: { increment: 1 }, updatedBy: actorId },
    });
  }

  private async logSecurityEvent(
    orgId: string,
    actorId?: string | null,
    action?: string,
    targetType?: string,
    targetId?: string | null,
    metadata?: any,
  ) {
    try {
      await this.prisma.securityAuditEvent.create({
        data: {
          organizationId: orgId,
          actorId: actorId ?? null,
          action: action || 'SECURITY_EVENT',
          targetType: targetType || 'SYSTEM',
          targetId: targetId ?? null,
          metadata: metadata ?? {},
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to record security audit event: ${e.message}`);
    }
  }
}
