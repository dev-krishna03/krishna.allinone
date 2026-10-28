import { Module } from '@nestjs/common';
import { WebhooksGovernanceController } from './webhooks-governance.controller';
import { WebhooksGovernanceService } from './webhooks-governance.service';
import { OutboxModule } from '../../platform/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [WebhooksGovernanceController],
  providers: [WebhooksGovernanceService],
  exports: [WebhooksGovernanceService],
})
export class WebhooksGovernanceModule {}
