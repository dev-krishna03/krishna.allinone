import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PolicyDecisionService } from './policy-decision.service';
import {
  PolicySimulationRequest,
  CreateRecordGrantDto,
  UpsertFieldPolicyDto,
} from '@business-os/types';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, TenantGuard)
export class SecurityPolicyController {
  constructor(private readonly policyService: PolicyDecisionService) {}

  @Get('policy/effective-access')
  async getEffectiveAccess(
    @Param('orgId') orgId: string,
    @Query('memberId') memberIdQuery: string,
    @Request() req: any,
  ) {
    const targetMemberId = memberIdQuery || req.membership.id;
    return this.policyService.getEffectiveAccessSummary(orgId, targetMemberId);
  }

  @Post('policy/simulate')
  async simulateAccess(
    @Param('orgId') orgId: string,
    @Body() dto: PolicySimulationRequest,
  ) {
    return this.policyService.simulateAccess(orgId, dto);
  }

  @Get('field-policies')
  async listFieldPolicies(
    @Param('orgId') orgId: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.policyService.listFieldPolicies(orgId, resourceType);
  }

  @Put('field-policies')
  async upsertFieldPolicy(
    @Param('orgId') orgId: string,
    @Body() dto: UpsertFieldPolicyDto,
    @Request() req: any,
  ) {
    return this.policyService.upsertFieldPolicy(orgId, dto, req.user?.id);
  }

  @Delete('field-policies/:policyId')
  async deleteFieldPolicy(
    @Param('orgId') orgId: string,
    @Param('policyId') policyId: string,
    @Request() req: any,
  ) {
    return this.policyService.deleteFieldPolicy(orgId, policyId, req.user?.id);
  }

  @Get('shares')
  async listRecordGrants(
    @Param('orgId') orgId: string,
    @Query('resourceType') resourceType?: string,
    @Query('recordId') recordId?: string,
  ) {
    return this.policyService.listRecordGrants(orgId, resourceType, recordId);
  }

  @Post('shares')
  async createRecordGrant(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRecordGrantDto,
    @Request() req: any,
  ) {
    return this.policyService.createRecordGrant(orgId, dto, req.user?.id);
  }

  @Delete('shares/:grantId')
  async deleteRecordGrant(
    @Param('orgId') orgId: string,
    @Param('grantId') grantId: string,
    @Request() req: any,
  ) {
    return this.policyService.deleteRecordGrant(orgId, grantId, req.user?.id);
  }

  @Get('security-audit')
  async listSecurityAudit(
    @Param('orgId') orgId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.policyService.listSecurityAuditEvents(
      orgId,
      Number(limit) || 50,
      Number(offset) || 0,
    );
  }
}
