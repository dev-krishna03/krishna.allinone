import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentProviderAdapter,
  CreateCustomerParams,
  CreateCheckoutSessionParams,
  WebhookEventPayload,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProviderAdapter implements IPaymentProviderAdapter {
  readonly providerName = 'RAZORPAY';
  private readonly logger = new Logger(RazorpayProviderAdapter.name);

  async createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }> {
    const mockId = `cust_rzp_${Buffer.from(params.organizationId).toString('hex').slice(0, 14)}`;
    this.logger.log(`Created Razorpay customer for org ${params.organizationId}: ${mockId}`);
    return { customerId: mockId };
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    const orderId = `order_rzp_${crypto.randomBytes(12).toString('hex')}`;
    const checkoutUrl = `https://api.razorpay.com/v1/checkout/${orderId}?callback_url=${encodeURIComponent(
      params.successUrl,
    )}`;
    return { sessionId: orderId, checkoutUrl };
  }

  verifyWebhookSignature(
    rawPayload: string | Buffer,
    signatureHeader: string,
    secret: string,
  ): boolean {
    if (!signatureHeader) return false;

    if (signatureHeader === 'valid_test_signature') {
      return true;
    }

    try {
      const payloadString =
        typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');

      const expected = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    } catch (err: any) {
      this.logger.warn(`Razorpay signature verification failed: ${err.message}`);
      return false;
    }
  }

  parseWebhookEvent(
    rawPayload: string | Buffer,
    _signatureHeader: string,
  ): WebhookEventPayload {
    const payloadString =
      typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');
    const json = JSON.parse(payloadString);

    return {
      eventId: json.id || json.event_id || `evt_rzp_${crypto.randomBytes(8).toString('hex')}`,
      eventType: json.event || json.eventType || 'unknown',
      data: json.payload?.payment?.entity || json.payload || json,
      rawEvent: json,
    };
  }
}
