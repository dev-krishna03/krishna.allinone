import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { DeveloperApiKeysService } from './developer-api-keys.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateDeveloperApiKeyDto } from './dto/developer.dto';

@ApiTags('Developer Console & Telemetry')
@Controller()
export class DeveloperController {
  constructor(
    private readonly developerService: DeveloperService,
    private readonly apiKeysService: DeveloperApiKeysService,
  ) {}

  @Get('developer/diagnostics')
  @ApiOperation({ summary: 'Platform diagnostics, runtime stats, and outbox status' })
  async getDiagnostics() {
    return this.developerService.getDiagnostics();
  }

  @Get('developer/api-clients')
  @ApiOperation({ summary: 'List API clients for current organization' })
  async getApiClients(@Headers('x-organization-id') orgId?: string) {
    return this.developerService.getApiClients(orgId);
  }

  @Post('developer/outbox/process')
  @ApiOperation({ summary: 'Trigger outbox event processing cycle' })
  async processOutbox() {
    return this.developerService.triggerOutboxReplay();
  }

  @Get('developer/security-diagnostics')
  @ApiOperation({ summary: 'Security policy engine status and registry telemetry' })
  async getSecurityDiagnostics() {
    return this.developerService.getSecurityDiagnostics();
  }

  @Get('developer/queues')
  @ApiOperation({ summary: 'Queue health, job counts, and recent execution telemetry' })
  async getQueues() {
    return this.developerService.getQueueTelemetry();
  }

  @Get('developer/events')
  @ApiOperation({ summary: 'Durable outbox events list with filters' })
  async listEvents(
    @Query('status') status?: any,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.developerService.listOutboxEvents(status, parsedLimit);
  }

  @Post('developer/events/:id/replay')
  @ApiOperation({ summary: 'Replay a failed or pending outbox event' })
  async replayEvent(@Param('id') id: string) {
    return this.developerService.replayOutboxEvent(id);
  }

  // --- Developer Programmatic API Keys per Organization ---
  @Get('organizations/:orgId/developer/api-keys')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List organization developer API keys' })
  async listApiKeys(@Param('orgId') orgId: string) {
    return this.apiKeysService.listApiKeys(orgId);
  }

  @Post('organizations/:orgId/developer/api-keys')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Generate new developer API key (raw key returned once)' })
  async createApiKey(
    @Param('orgId') orgId: string,
    @Body() dto: CreateDeveloperApiKeyDto,
    @Request() req: any,
  ) {
    return this.apiKeysService.createApiKey(orgId, dto, req.user?.id);
  }

  @Delete('organizations/:orgId/developer/api-keys/:keyId')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Revoke developer API key' })
  async revokeApiKey(
    @Param('orgId') orgId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.revokeApiKey(orgId, keyId);
  }
}
