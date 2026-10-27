import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { UserRole, OrgStatus, PlanTier } from '@prisma/client';

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

    if (!existingOrg) {
      const org = await this.prisma.organization.create({
        data: {
          name: 'Acme Enterprise',
          slug: 'acme',
          status: OrgStatus.ACTIVE,
          planTier: PlanTier.GROWTH,
        },
      });

      await this.prisma.user.create({
        data: {
          organizationId: org.id,
          fullName: 'Alex Mercer',
          email: 'alex@acme.inc',
          role: UserRole.OWNER,
          status: 'ACTIVE',
        },
      });

      // Also create an API client for developer console
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
  }

  async getCurrentUserContext(orgIdHeader?: string) {
    let org = null;
    if (orgIdHeader) {
      org = await this.prisma.organization.findUnique({
        where: { id: orgIdHeader },
      });
    }

    if (!org) {
      org = await this.prisma.organization.findFirst({
        where: { slug: 'acme' },
      });
    }

    if (!org) {
      throw new Error('Default organization not initialized');
    }

    const user = await this.prisma.user.findFirst({
      where: { organizationId: org.id },
    });

    return {
      user: user || {
        id: 'bootstrap-user-id',
        organizationId: org.id,
        email: 'alex@acme.inc',
        fullName: 'Alex Mercer',
        role: UserRole.OWNER,
        status: 'ACTIVE',
      },
      organization: org,
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
