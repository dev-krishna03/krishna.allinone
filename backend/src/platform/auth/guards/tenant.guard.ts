import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User context missing');
    }

    // Resolve tenant from header or route parameter
    const orgId =
      request.headers['x-organization-id'] ||
      request.params.orgId;

    if (!orgId) {
      throw new BadRequestException('Organization identifier required (via x-organization-id header or path parameter)');
    }

    // Verify active membership in the organization
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (membership.status !== 'ACTIVE') {
      throw new ForbiddenException(`Your membership in this organization is ${membership.status.toLowerCase()}`);
    }

    if (membership.organization.status !== 'ACTIVE') {
      throw new ForbiddenException('This organization workspace has been suspended or deactivated');
    }

    // Attach verified tenant context to request
    request.tenant = membership.organization;
    request.membership = membership;

    return true;
  }
}
