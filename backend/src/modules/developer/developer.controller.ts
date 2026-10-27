import { Controller, Get, Post, Headers } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Developer Console')
@Controller('developer')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Get('diagnostics')
  @ApiOperation({ summary: 'Platform diagnostics, runtime stats, and outbox status' })
  async getDiagnostics() {
    return this.developerService.getDiagnostics();
  }

  @Get('api-clients')
  @ApiOperation({ summary: 'List API clients for current organization' })
  async getApiClients(@Headers('x-organization-id') orgId?: string) {
    return this.developerService.getApiClients(orgId);
  }

  @Post('outbox/process')
  @ApiOperation({ summary: 'Trigger outbox event processing cycle' })
  async processOutbox() {
    return this.developerService.triggerOutboxReplay();
  }
}
