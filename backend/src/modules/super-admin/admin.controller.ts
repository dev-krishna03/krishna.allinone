import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SuperAdminService } from './admin.service';
import { IncidentsService } from './incidents.service';
import { FeatureFlagsService } from './feature-flags.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  CreateFeatureRolloutDto,
  UpdateFeatureRolloutDto,
} from './dto/admin.dto';

@ApiTags('Super Admin Platform Control Plane')
@Controller()
export class SuperAdminController {
  constructor(
    private readonly adminService: SuperAdminService,
    private readonly incidentsService: IncidentsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @Get(['admin/overview', 'platform/overview'])
  @ApiOperation({ summary: 'Super Admin privacy-safe operational metrics' })
  async getOverview() {
    return this.adminService.getOperationalMetrics();
  }

  @Get(['admin/system-health', 'platform/system-health'])
  @ApiOperation({ summary: 'Platform deep system health and services diagnostics' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('admin/audit-logs')
  @ApiOperation({ summary: 'Super Admin aggregate audit trail' })
  async getAuditLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 25;
    return this.adminService.getRecentAuditLogs(parsedLimit);
  }

  @Get(['admin/tenants', 'platform/tenants'])
  @ApiOperation({ summary: 'Super Admin aggregate privacy-safe tenant overview' })
  async getTenants() {
    return this.adminService.getTenantsList();
  }

  @Get('admin/security-telemetry')
  @ApiOperation({ summary: 'Super Admin privacy-safe aggregate authorization health' })
  async getSecurityTelemetry() {
    return this.adminService.getSecurityTelemetry();
  }

  // --- Platform Incidents Governance ---
  @Get(['platform/incidents', 'admin/incidents'])
  @ApiOperation({ summary: 'List platform incidents with severity and timeline' })
  async listIncidents(@Query('status') status?: any) {
    return this.incidentsService.listIncidents(status);
  }

  @Get(['platform/incidents/:id', 'admin/incidents/:id'])
  @ApiOperation({ summary: 'Get details for a specific platform incident' })
  async getIncident(@Param('id') id: string) {
    return this.incidentsService.getIncident(id);
  }

  @Post(['platform/incidents', 'admin/incidents'])
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Declare a new platform incident' })
  async createIncident(@Body() dto: CreateIncidentDto, @Request() req: any) {
    return this.incidentsService.createIncident(dto, req.user?.id);
  }

  @Patch(['platform/incidents/:id', 'admin/incidents/:id'])
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update incident status, severity, or append timeline update' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @Request() req: any,
  ) {
    return this.incidentsService.updateIncident(id, dto, req.user?.id);
  }

  // --- Feature Rollouts Governance ---
  @Get(['platform/feature-flags', 'admin/feature-flags'])
  @ApiOperation({ summary: 'List platform feature rollouts and targeting rules' })
  async listFeatureFlags() {
    return this.featureFlagsService.listFlags();
  }

  @Post(['platform/feature-flags', 'admin/feature-flags'])
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new feature flag rollout rule' })
  async createFeatureFlag(@Body() dto: CreateFeatureRolloutDto, @Request() req: any) {
    return this.featureFlagsService.createFlag(dto, req.user?.id);
  }

  @Patch(['platform/feature-flags/:id', 'admin/feature-flags/:id'])
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update feature rollout percentages or targets' })
  async updateFeatureFlag(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureRolloutDto,
    @Request() req: any,
  ) {
    return this.featureFlagsService.updateFlag(id, dto, req.user?.id);
  }

  @Get(['platform/feature-flags/:flagKey/evaluate', 'admin/feature-flags/:flagKey/evaluate'])
  @ApiOperation({ summary: 'Evaluate feature flag for an organization, edition or user' })
  async evaluateFeatureFlag(
    @Param('flagKey') flagKey: string,
    @Query('organizationId') organizationId?: string,
    @Query('edition') edition?: string,
    @Query('userId') userId?: string,
  ) {
    return this.featureFlagsService.evaluateFlag(flagKey, {
      organizationId,
      edition,
      userId,
    });
  }
}
