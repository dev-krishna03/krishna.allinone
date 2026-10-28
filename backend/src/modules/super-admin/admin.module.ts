import { Module } from '@nestjs/common';
import { SuperAdminController } from './admin.controller';
import { SuperAdminService } from './admin.service';
import { IncidentsService } from './incidents.service';
import { FeatureFlagsService } from './feature-flags.service';
import { OutboxModule } from '../../platform/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, IncidentsService, FeatureFlagsService],
  exports: [SuperAdminService, IncidentsService, FeatureFlagsService],
})
export class SuperAdminModule {}
export { SuperAdminModule as AdminModule };
