import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from '@business-os/types';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, TenantGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  async listRoles(@Param('orgId') orgId: string) {
    return this.rolesService.listRoles(orgId);
  }

  @Post('roles')
  async createRole(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleDto,
    @Request() req: any,
  ) {
    return this.rolesService.createRole(orgId, dto, req.user?.id);
  }

  @Post('roles/seed-defaults')
  async seedDefaultRoles(@Param('orgId') orgId: string) {
    await this.rolesService.seedDefaultOrgRoles(orgId);
    return { success: true, message: 'Default roles initialized' };
  }

  @Get('roles/:roleId')
  async getRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.getRole(orgId, roleId);
  }

  @Put('roles/:roleId')
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: any,
  ) {
    return this.rolesService.updateRole(orgId, roleId, dto, req.user?.id);
  }

  @Delete('roles/:roleId')
  async deleteRole(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    return this.rolesService.deleteRole(orgId, roleId, req.user?.id);
  }

  @Post('members/:memberId/roles')
  async assignRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body('roleId') roleId: string,
    @Request() req: any,
  ) {
    return this.rolesService.assignRoleToMember(orgId, memberId, roleId, req.user?.id);
  }

  @Delete('members/:memberId/roles/:roleId')
  async removeRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    return this.rolesService.removeRoleFromMember(orgId, memberId, roleId, req.user?.id);
  }
}
