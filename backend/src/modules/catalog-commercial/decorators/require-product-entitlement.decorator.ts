import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PRODUCT_KEY = 'require_product_entitlement';

export const RequireProductEntitlement = (productSlug: string) =>
  SetMetadata(REQUIRE_PRODUCT_KEY, productSlug);
