import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionRegistryService } from './permission-registry.service';
import { AuthGuard } from '../../auth/guards/auth.guard';

@Controller('permissions')
@UseGuards(AuthGuard)
export class PermissionCatalogController {
  constructor(private readonly registryService: PermissionRegistryService) {}

  @Get('catalog')
  async getCatalog() {
    const permissions = await this.registryService.listPermissions();
    const grouped = await this.registryService.listPermissionsGrouped();
    return {
      total: permissions.length,
      permissions,
      grouped,
    };
  }
}
