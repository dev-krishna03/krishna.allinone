import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PRODUCT_KEY } from '../decorators/require-product-entitlement.decorator';
import { PrismaService } from '../../../platform/database/prisma.service';
import { EntitlementStatus, SeatStatus } from '@prisma/client';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredProductSlug = this.reflector.getAllAndOverride<string>(
      REQUIRE_PRODUCT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredProductSlug) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const membership = request.membership;

    if (!membership) {
      throw new ForbiddenException('Organization context required');
    }

    // Organization OWNER has global administrative pass
    if (membership.role === 'OWNER') {
      return true;
    }

    // Resolve product by slug
    const product = await this.prisma.saaSProduct.findUnique({
      where: { slug: requiredProductSlug },
    });

    if (!product) {
      throw new ForbiddenException(`Unknown product module: ${requiredProductSlug}`);
    }

    // 1. Verify tenant entitlement (either standalone or via bundle)
    const entitlement = await this.prisma.orgEntitlement.findFirst({
      where: {
        organizationId: membership.organizationId,
        status: { in: [EntitlementStatus.ACTIVE, EntitlementStatus.TRIAL] },
        OR: [
          { productId: product.id },
          {
            bundle: {
              bundleItems: { some: { productId: product.id } },
            },
          },
        ],
      },
    });

    if (!entitlement) {
      throw new ForbiddenException(
        `Organization is not subscribed to product module "${product.name}". Please activate a subscription in the App Marketplace.`,
      );
    }

    // 2. Verify member has an allocated seat license for this product
    const seat = await this.prisma.orgSeatAssignment.findFirst({
      where: {
        organizationId: membership.organizationId,
        memberId: membership.id,
        status: SeatStatus.ACTIVE,
        OR: [{ productId: product.id }, { productId: null }],
      },
    });

    if (!seat) {
      throw new ForbiddenException(
        `You do not hold an assigned seat license for product "${product.name}". Contact your organization administrator to allocate a seat.`,
      );
    }

    return true;
  }
}
