import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { AuditService } from '../../platform/audit/audit.service';
import {
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberDto,
  TransferOwnershipDto,
} from './dto/organization.dto';
import { UserRole, MemberStatus, InviteStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService
  ) {}

  // 1. Create Organization (Tenant Provisioning)
  async createOrganization(userId: string, dto: CreateOrganizationDto, ipAddress?: string) {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    // Check slug uniqueness
    const existing = await this.prisma.organization.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existing) {
      throw new ConflictException(`Organization slug '${normalizedSlug}' is already taken`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug: normalizedSlug,
          legalName: dto.legalName?.trim(),
          timezone: dto.timezone || 'UTC',
          locale: dto.locale || 'en-US',
          country: dto.country || 'US',
          currency: dto.currency || 'USD',
          seatLimit: 25,
          status: 'ACTIVE',
        },
      });

      // Default owner membership
      const member = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: UserRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });

      return { org, member };
    });

    // Transactional outbox event
    await this.outboxService.publish(
      'organization.created',
      'Organization',
      result.org.id,
      {
        organizationId: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        ownerUserId: userId,
      }
    );

    await this.auditService.record({
      organizationId: result.org.id,
      actorId: userId,
      action: 'organization.provisioned',
      entityType: 'Organization',
      entityId: result.org.id,
      metadata: { slug: result.org.slug, name: result.org.name },
      ipAddress,
    });

    return result.org;
  }

  // 2. List Organizations for User
  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, status: MemberStatus.ACTIVE },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      organization: m.organization,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      membersCount: m.organization._count.members,
    }));
  }

  // 3. Get Organization Details
  async getOrganization(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    return {
      ...org,
      membersCount: org._count.members,
      currentRole: membership?.role,
    };
  }

  // 4. Invite Member
  async inviteMember(
    orgId: string,
    inviterId: string,
    dto: InviteMemberDto,
    ipAddress?: string
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { members: { where: { status: MemberStatus.ACTIVE } } },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Seat limit check
    if (org._count.members >= org.seatLimit) {
      throw new BadRequestException(
        `Organization seat capacity reached (${org.seatLimit} seats). Upgrade plan to invite more members.`
      );
    }

    // Check if user is already an active member
    const existingUser = await this.prisma.identityUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember && existingMember.status === MemberStatus.ACTIVE) {
        throw new ConflictException('User is already an active member of this organization');
      }
    }

    // Check if there is an existing pending invitation
    const existingInvite = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId: orgId,
        email: normalizedEmail,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException('A pending invitation has already been dispatched to this email');
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day TTL

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email: normalizedEmail,
        role: dto.role,
        token,
        status: InviteStatus.PENDING,
        expiresAt,
        invitedById: inviterId,
      },
    });

    await this.outboxService.publish(
      'organization.member.invited',
      'OrganizationInvitation',
      invitation.id,
      {
        invitationId: invitation.id,
        organizationId: orgId,
        email: invitation.email,
        role: invitation.role,
        token,
      }
    );

    await this.auditService.record({
      organizationId: orgId,
      actorId: inviterId,
      action: 'organization.member.invited',
      entityType: 'OrganizationInvitation',
      entityId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
      ipAddress,
    });

    return invitation;
  }

  // 5. List Invitations
  async listInvitations(orgId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId: orgId, status: InviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  // 6. Accept Invitation
  async acceptInvitation(token: string, userId: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: { where: { status: MemberStatus.ACTIVE } } },
            },
          },
        },
      },
    });

    if (!invite || invite.status !== InviteStatus.PENDING || new Date() > invite.expiresAt) {
      throw new BadRequestException('Invitation is invalid, expired, or already used');
    }

    // Re-verify seat capacity at acceptance time
    if (invite.organization._count.members >= invite.organization.seatLimit) {
      throw new BadRequestException('Organization seat capacity reached. Contact organization admin.');
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      // Mark invite accepted
      await tx.organizationInvitation.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });

      // Upsert member with the exact role bound to the invitation
      return tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId,
          },
        },
        create: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
          status: MemberStatus.ACTIVE,
        },
        update: {
          role: invite.role,
          status: MemberStatus.ACTIVE,
        },
      });
    });

    await this.auditService.record({
      organizationId: invite.organizationId,
      actorId: userId,
      action: 'organization.invitation.accepted',
      entityType: 'OrganizationMember',
      entityId: membership.id,
      metadata: { role: invite.role },
    });

    return {
      message: 'Invitation accepted successfully',
      organizationId: invite.organizationId,
      role: invite.role,
    };
  }

  // 7. Revoke Invitation
  async revokeInvitation(orgId: string, inviteId: string, actorId: string) {
    const invite = await this.prisma.organizationInvitation.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.organizationInvitation.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED },
    });

    return { success: true };
  }

  // 8. List Members
  async listMembers(orgId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isEmailVerified: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  // 9. Update Member
  async updateMember(
    orgId: string,
    memberId: string,
    updaterId: string,
    dto: UpdateMemberDto,
    ipAddress?: string
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Safety rule: Cannot demote or suspend sole owner
    if (member.role === UserRole.OWNER && (dto.role !== undefined || dto.status === MemberStatus.SUSPENDED)) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: UserRole.OWNER, status: MemberStatus.ACTIVE },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot modify role or suspend the sole remaining Organization Owner');
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
        status: dto.status,
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    if (dto.status === MemberStatus.SUSPENDED) {
      await this.outboxService.publish(
        'organization.member.suspended',
        'OrganizationMember',
        memberId,
        { organizationId: orgId, userId: member.userId, updatedBy: updaterId }
      );
    }

    await this.auditService.record({
      organizationId: orgId,
      actorId: updaterId,
      action: 'organization.member.updated',
      entityType: 'OrganizationMember',
      entityId: memberId,
      metadata: { newRole: dto.role, newStatus: dto.status },
      ipAddress,
    });

    return updated;
  }

  // 10. Remove Member
  async removeMember(orgId: string, memberId: string, removerId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the sole remaining Organization Owner');
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    await this.auditService.record({
      organizationId: orgId,
      actorId: removerId,
      action: 'organization.member.removed',
      entityType: 'OrganizationMember',
      entityId: memberId,
    });

    return { success: true };
  }

  // 11. Transfer Ownership
  async transferOwnership(orgId: string, currentOwnerId: string, dto: TransferOwnershipDto) {
    const targetMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: dto.newOwnerUserId,
        },
      },
    });

    if (!targetMember || targetMember.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Target user is not an active member of this organization');
    }

    await this.prisma.$transaction(async (tx) => {
      // Promote new owner
      await tx.organizationMember.update({
        where: { id: targetMember.id },
        data: { role: UserRole.OWNER },
      });

      // Demote current owner to ADMIN
      await tx.organizationMember.updateMany({
        where: { organizationId: orgId, userId: currentOwnerId },
        data: { role: UserRole.ADMIN },
      });
    });

    await this.auditService.record({
      organizationId: orgId,
      actorId: currentOwnerId,
      action: 'organization.ownership.transferred',
      entityType: 'Organization',
      entityId: orgId,
      metadata: { newOwnerId: dto.newOwnerUserId },
    });

    return { success: true, message: 'Ownership successfully transferred' };
  }
}
