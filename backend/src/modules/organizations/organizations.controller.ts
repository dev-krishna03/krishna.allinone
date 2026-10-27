import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberDto,
  AcceptInvitationDto,
  TransferOwnershipDto,
} from './dto/organization.dto';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { RolesGuard, Roles } from '../../platform/auth/guards/roles.guard';
import { CurrentUser } from '../../platform/auth/decorators/auth-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

@ApiTags('Organizations & Tenancy')
@Controller('organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and provision a new organization tenant' })
  async createOrganization(
    @CurrentUser() user: any,
    @Body() dto: CreateOrganizationDto,
    @Ip() ip: string
  ) {
    return this.orgService.createOrganization(user.id, dto, ip);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the user is a member of' })
  async listUserOrganizations(@CurrentUser() user: any) {
    return this.orgService.listUserOrganizations(user.id);
  }

  @Get(':orgId')
  @UseGuards(TenantGuard)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Get details for a specific organization' })
  async getOrganization(
    @Param('orgId') orgId: string,
    @CurrentUser() user: any
  ) {
    return this.orgService.getOrganization(orgId, user.id);
  }

  // --- Member Invitations ---

  @Post(':orgId/invites')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Invite a member to the organization with specific role' })
  async inviteMember(
    @Param('orgId') orgId: string,
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
    @Ip() ip: string
  ) {
    return this.orgService.inviteMember(orgId, user.id, dto, ip);
  }

  @Get(':orgId/invites')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'List pending organization invitations' })
  async listInvitations(@Param('orgId') orgId: string) {
    return this.orgService.listInvitations(orgId);
  }

  @Post(':orgId/invites/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation and join organization' })
  async acceptInvitation(
    @CurrentUser() user: any,
    @Body() dto: AcceptInvitationDto
  ) {
    return this.orgService.acceptInvitation(dto.token, user.id);
  }

  @Delete(':orgId/invites/:inviteId')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Revoke an invitation' })
  async revokeInvitation(
    @Param('orgId') orgId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: any
  ) {
    return this.orgService.revokeInvitation(orgId, inviteId, user.id);
  }

  // --- Member Management ---

  @Get(':orgId/members')
  @UseGuards(TenantGuard)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(@Param('orgId') orgId: string) {
    return this.orgService.listMembers(orgId);
  }

  @Patch(':orgId/members/:memberId')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Update a member role or suspension status' })
  async updateMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateMemberDto,
    @Ip() ip: string
  ) {
    return this.orgService.updateMember(orgId, memberId, user.id, dto, ip);
  }

  @Delete(':orgId/members/:memberId')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any
  ) {
    return this.orgService.removeMember(orgId, memberId, user.id);
  }

  @Post(':orgId/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Transfer organization ownership to another member' })
  async transferOwnership(
    @Param('orgId') orgId: string,
    @CurrentUser() user: any,
    @Body() dto: TransferOwnershipDto
  ) {
    return this.orgService.transferOwnership(orgId, user.id, dto);
  }
}
