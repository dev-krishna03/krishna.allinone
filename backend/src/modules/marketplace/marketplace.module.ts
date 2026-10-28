import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { OutboxModule } from '../../platform/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
