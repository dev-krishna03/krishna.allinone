export interface CreateCustomerParams {
  email: string;
  name?: string;
  organizationId: string;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutSessionParams {
  customerId?: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  data: Record<string, any>;
  rawEvent: any;
}

export interface IPaymentProviderAdapter {
  readonly providerName: string;

  createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }>;

  createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ sessionId: string; checkoutUrl: string }>;

  verifyWebhookSignature(
    rawPayload: string | Buffer,
    signatureHeader: string,
    secret: string,
  ): boolean;

  parseWebhookEvent(
    rawPayload: string | Buffer,
    signatureHeader: string,
  ): WebhookEventPayload;
}
