import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { OutboxModule } from '../../platform/outbox/outbox.module';
import { AuthModule } from '../../platform/auth/auth.module';
import { BillingService } from './billing.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { DunningService } from './dunning.service';
import { StripeProviderAdapter } from './adapters/stripe-provider.adapter';
import { RazorpayProviderAdapter } from './adapters/razorpay-provider.adapter';
import { BillingController } from './billing.controller';
import { WebhooksController } from './webhooks.controller';
import { SuperAdminBillingController } from './super-admin-billing.controller';

@Module({
  imports: [DatabaseModule, OutboxModule, AuthModule],
  controllers: [
    BillingController,
    WebhooksController,
    SuperAdminBillingController,
  ],
  providers: [
    BillingService,
    WebhookProcessorService,
    DunningService,
    StripeProviderAdapter,
    RazorpayProviderAdapter,
  ],
  exports: [BillingService, WebhookProcessorService, DunningService],
})
export class BillingModule {}
