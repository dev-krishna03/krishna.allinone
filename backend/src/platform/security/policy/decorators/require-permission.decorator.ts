import { SetMetadata } from '@nestjs/common';

export const PERMISSION_CHECK_KEY = 'permission_check';

export interface RequiredPermissionMetadata {
  resource: string;
  action: string;
  module?: string;
}

export const RequirePermission = (resource: string, action: string, module?: string) =>
  SetMetadata(PERMISSION_CHECK_KEY, { resource, action, module });
