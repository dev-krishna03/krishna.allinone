import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { UserRole, OrgStatus, PlanTier, MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class IdentityService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedBootstrapTenant();
  }

  async seedBootstrapTenant() {
    const existingOrg = await this.prisma.organization.findFirst({
      where: { slug: 'acme' },
    });

    let org = existingOrg;
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Acme Enterprise',
          slug: 'acme',
          legalName: 'Acme Enterprise Global Corp.',
          timezone: 'America/New_York',
          locale: 'en-US',
          country: 'US',
          currency: 'USD',
          seatLimit: 25,
          status: OrgStatus.ACTIVE,
          planTier: PlanTier.GROWTH,
        },
      });

      // API client for developer console
      await this.prisma.apiClient.create({
        data: {
          organizationId: org.id,
          name: 'Production Invoicing Service',
          clientId: 'client_live_acme_8923a',
          hashedSecret: '$2b$10$e84jd82390fj30fksl...',
          scopes: ['read:catalog', 'write:invoices', 'read:org'],
        },
      });
    }

    // Ensure bootstrap identity user exists
    let user = await this.prisma.identityUser.findUnique({
      where: { email: 'alex@acme.inc' },
    });

    if (!user) {
      try {
        const passwordHash = await bcrypt.hash('P@ssword123!', 10);
        user = await this.prisma.identityUser.create({
          data: {
            email: 'alex@acme.inc',
            fullName: 'Alex Mercer',
            status: 'ACTIVE',
            isEmailVerified: true,
            credentials: {
              create: {
                passwordHash,
                algorithm: 'bcrypt',
              },
            },
          },
        });
      } catch {
        user = await this.prisma.identityUser.findUnique({
          where: { email: 'alex@acme.inc' },
        });
      }
    }

    // Ensure membership exists
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      await this.prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: UserRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
    }
  }

  async getCurrentUserContext(orgIdHeader?: string, authenticatedUserId?: string) {
    let user = null;
    if (authenticatedUserId) {
      user = await this.prisma.identityUser.findUnique({
        where: { id: authenticatedUserId },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });
    }

    if (!user) {
      user = await this.prisma.identityUser.findUnique({
        where: { email: 'alex@acme.inc' },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });
    }

    let org = null;
    if (orgIdHeader) {
      org = await this.prisma.organization.findUnique({
        where: { id: orgIdHeader },
      });
    }

    if (!org && user && user.memberships.length > 0) {
      org = user.memberships[0].organization;
    }

    if (!org) {
      org = await this.prisma.organization.findFirst({
        where: { slug: 'acme' },
      });
    }

    const currentMembership = user?.memberships.find(
      (m) => m.organizationId === org?.id
    );

    return {
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
        isEmailVerified: user?.isEmailVerified,
        role: currentMembership?.role || UserRole.OWNER,
        status: user?.status,
      },
      organization: org,
      membership: currentMembership,
      permissions: [
        'org:read',
        'org:update',
        'users:manage',
        'billing:read',
        'catalog:read',
        'audit:read',
        'developer:access',
      ],
      allOrganizations: await this.prisma.organization.findMany({
        select: { id: true, name: true, slug: true, planTier: true },
        take: 10,
      }),
    };
  }
}
