import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { DeveloperApiKeysService } from './developer-api-keys.service';
import { OutboxModule } from '../../platform/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [DeveloperController],
  providers: [DeveloperService, DeveloperApiKeysService],
  exports: [DeveloperService, DeveloperApiKeysService],
})
export class DeveloperModule {}
