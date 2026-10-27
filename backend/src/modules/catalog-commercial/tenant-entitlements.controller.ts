import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { EntitlementsService } from './entitlements.service';
import {
  SubscribeEntitlementDto,
  AssignSeatDto,
  RecordUsageDto,
} from './dto/catalog.dto';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, TenantGuard)
export class TenantEntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get('entitlements')
  async listEntitlements(@Param('orgId') orgId: string) {
    return this.entitlementsService.listTenantEntitlements(orgId);
  }

  @Post('entitlements/subscribe')
  async subscribeTenant(
    @Param('orgId') orgId: string,
    @Body() dto: SubscribeEntitlementDto,
    @Request() req: any,
  ) {
    return this.entitlementsService.subscribeTenant(orgId, dto, req.user?.id);
  }

  @Get('entitlements/effective-nav')
  async getEffectiveAppNavigation(
    @Param('orgId') orgId: string,
    @Request() req: any,
  ) {
    return this.entitlementsService.resolveEffectiveAppNavigation(
      orgId,
      req.membership.id,
    );
  }

  @Get('seats')
  async listSeats(
    @Param('orgId') orgId: string,
    @Query('entitlementId') entitlementId?: string,
  ) {
    return this.entitlementsService.listSeatAssignments(orgId, entitlementId);
  }

  @Post('seats/assign')
  async assignSeat(
    @Param('orgId') orgId: string,
    @Body() dto: AssignSeatDto,
    @Request() req: any,
  ) {
    return this.entitlementsService.assignSeat(orgId, dto, req.user?.id);
  }

  @Delete('seats/:assignmentId')
  async revokeSeat(
    @Param('orgId') orgId: string,
    @Param('assignmentId') assignmentId: string,
    @Request() req: any,
  ) {
    return this.entitlementsService.revokeSeat(orgId, assignmentId, req.user?.id);
  }

  @Get('usage')
  async getUsage(@Param('orgId') orgId: string) {
    return this.entitlementsService.getTenantUsage(orgId);
  }

  @Post('usage/record')
  async recordUsage(
    @Param('orgId') orgId: string,
    @Body() dto: RecordUsageDto,
  ) {
    return this.entitlementsService.recordUsage(orgId, dto);
  }
}
