import { Global, Module } from '@nestjs/common';
import { PlatformConfigService } from './config.service';

@Global()
@Module({
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
