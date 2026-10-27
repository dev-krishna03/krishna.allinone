import { Controller, Get, Query } from '@nestjs/common';
import { SuperAdminService } from './admin.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super Admin')
@Controller('admin')
export class SuperAdminController {
  constructor(private readonly adminService: SuperAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Super Admin privacy-safe operational metrics' })
  async getOverview() {
    return this.adminService.getOperationalMetrics();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Super Admin aggregate audit trail' })
  async getAuditLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 25;
    return this.adminService.getRecentAuditLogs(parsedLimit);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Super Admin aggregate tenant overview' })
  async getTenants() {
    return this.adminService.getTenantsList();
  }
}
