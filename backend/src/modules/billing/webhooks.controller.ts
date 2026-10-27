import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookProcessorService } from './webhook-processor.service';

@Controller('webhooks/billing')
export class WebhooksController {
  constructor(private readonly webhookProcessor: WebhookProcessorService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Body() body: any,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('x-signature') genericSignature?: string,
  ) {
    const signature = stripeSignature || razorpaySignature || genericSignature || '';
    const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);

    return this.webhookProcessor.processIncomingWebhook(
      provider,
      rawPayload,
      signature,
    );
  }
}
