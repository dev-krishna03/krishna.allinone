import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { CreateTeamDto, UpdateTeamDto } from '@business-os/types';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async listTeams(orgId: string) {
    const teams = await this.prisma.orgTeam.findMany({
      where: { organizationId: orgId },
      include: {
        leadMember: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        parentTeam: { select: { id: true, name: true, code: true } },
        childTeams: { select: { id: true, name: true, code: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      ...t,
      memberCount: t._count.members,
    }));
  }

  async getTeam(orgId: string, teamId: string) {
    const team = await this.prisma.orgTeam.findFirst({
      where: { id: teamId, organizationId: orgId },
      include: {
        leadMember: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        parentTeam: { select: { id: true, name: true, code: true } },
        childTeams: { select: { id: true, name: true, code: true } },
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!team) throw new NotFoundException('Team not found');

    return {
      ...team,
      memberCount: team._count.members,
    };
  }

  async createTeam(orgId: string, dto: CreateTeamDto, actorId?: string) {
    const code = (dto.code || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 50);

    const existing = await this.prisma.orgTeam.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Team with code '${code}' already exists`);
    }

    if (dto.parentTeamId) {
      const parent = await this.prisma.orgTeam.findFirst({
        where: { id: dto.parentTeamId, organizationId: orgId },
      });
      if (!parent) throw new BadRequestException('Parent team not found');
    }

    if (dto.leadMemberId) {
      const lead = await this.prisma.organizationMember.findFirst({
        where: { id: dto.leadMemberId, organizationId: orgId },
      });
      if (!lead) throw new BadRequestException('Lead member not found in this organization');
    }

    const team = await this.prisma.orgTeam.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        code,
        description: dto.description,
        parentTeamId: dto.parentTeamId || null,
        leadMemberId: dto.leadMemberId || null,
      },
      include: {
        parentTeam: true,
        leadMember: {
          include: { user: true },
        },
      },
    });

    // If lead was specified, also automatically add lead to team members
    if (dto.leadMemberId) {
      await this.prisma.orgTeamMember.create({
        data: {
          teamId: team.id,
          memberId: dto.leadMemberId,
        },
      });
    }

    await this.outbox.publish(
      'security.team.created',
      'OrgTeam',
      team.id,
      { orgId, teamId: team.id, name: team.name, code: team.code, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'TEAM_CREATED',
        targetType: 'OrgTeam',
        targetId: team.id,
        metadata: { teamName: team.name, code: team.code },
      },
    });

    return team;
  }

  async updateTeam(orgId: string, teamId: string, dto: UpdateTeamDto, actorId?: string) {
    const team = await this.prisma.orgTeam.findFirst({
      where: { id: teamId, organizationId: orgId },
    });
    if (!team) throw new NotFoundException('Team not found');

    if (dto.parentTeamId && dto.parentTeamId === teamId) {
      throw new BadRequestException('A team cannot be its own parent');
    }

    const updated = await this.prisma.orgTeam.update({
      where: { id: teamId },
      data: {
        name: dto.name ?? team.name,
        description: dto.description !== undefined ? dto.description : team.description,
        parentTeamId: dto.parentTeamId !== undefined ? dto.parentTeamId : team.parentTeamId,
        leadMemberId: dto.leadMemberId !== undefined ? dto.leadMemberId : team.leadMemberId,
      },
      include: {
        parentTeam: true,
        leadMember: {
          include: { user: true },
        },
      },
    });

    await this.outbox.publish(
      'security.team.updated',
      'OrgTeam',
      team.id,
      { orgId, teamId: team.id, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'TEAM_UPDATED',
        targetType: 'OrgTeam',
        targetId: team.id,
        metadata: { updates: dto as any },
      },
    });

    return updated;
  }

  async deleteTeam(orgId: string, teamId: string, actorId?: string) {
    const team = await this.prisma.orgTeam.findFirst({
      where: { id: teamId, organizationId: orgId },
    });
    if (!team) throw new NotFoundException('Team not found');

    await this.prisma.orgTeam.delete({
      where: { id: teamId },
    });

    await this.outbox.publish(
      'security.team.deleted',
      'OrgTeam',
      teamId,
      { orgId, teamId, teamName: team.name, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'TEAM_DELETED',
        targetType: 'OrgTeam',
        targetId: teamId,
        metadata: { teamName: team.name },
      },
    });

    return { success: true };
  }

  async addTeamMember(
    orgId: string,
    teamId: string,
    memberId: string,
    actorId?: string,
  ) {
    const [team, member] = await Promise.all([
      this.prisma.orgTeam.findFirst({
        where: { id: teamId, organizationId: orgId },
      }),
      this.prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId: orgId },
        include: { user: true },
      }),
    ]);

    if (!team) throw new NotFoundException('Team not found');
    if (!member) throw new NotFoundException('Member not found');

    const membership = await this.prisma.orgTeamMember.upsert({
      where: {
        teamId_memberId: { teamId, memberId },
      },
      create: {
        teamId,
        memberId,
      },
      update: {},
      include: {
        member: {
          include: { user: true },
        },
      },
    });

    await this.outbox.publish(
      'security.team.member_added',
      'OrgTeamMember',
      membership.id,
      { orgId, teamId, memberId, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'TEAM_MEMBER_ADDED',
        targetType: 'OrgTeam',
        targetId: teamId,
        metadata: { memberId, memberEmail: member.user.email },
      },
    });

    return membership;
  }

  async removeTeamMember(
    orgId: string,
    teamId: string,
    memberId: string,
    actorId?: string,
  ) {
    const membership = await this.prisma.orgTeamMember.findFirst({
      where: { teamId, memberId },
    });

    if (!membership) {
      throw new NotFoundException('Team member assignment not found');
    }

    await this.prisma.orgTeamMember.delete({
      where: { id: membership.id },
    });

    await this.outbox.publish(
      'security.team.member_removed',
      'OrgTeamMember',
      membership.id,
      { orgId, teamId, memberId, actorId },
    );

    await this.prisma.securityAuditEvent.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        action: 'TEAM_MEMBER_REMOVED',
        targetType: 'OrgTeam',
        targetId: teamId,
        metadata: { memberId },
      },
    });

    return { success: true };
  }
}
