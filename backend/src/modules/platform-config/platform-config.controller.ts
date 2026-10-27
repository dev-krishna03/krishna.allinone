import { Controller, Get } from '@nestjs/common';
import { PlatformConfigService } from '../../platform/config/config.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Platform')
@Controller('platform')
export class PlatformConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Retrieve runtime platform configuration' })
  getConfig() {
    return this.config.getConfigSummary();
  }
}
