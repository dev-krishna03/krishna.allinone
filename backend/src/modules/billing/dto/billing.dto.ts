import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class ComputeQuoteDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsOptional()
  planVersionId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  seatQuantity?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsOptional()
  planVersionId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  seatQuantity?: number;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

export class ChangeSubscriptionDto {
  @IsString()
  @IsOptional()
  targetPlanId?: string;

  @IsString()
  @IsOptional()
  targetPlanVersionId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  seatQuantity?: number;

  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @IsBoolean()
  @IsOptional()
  pause?: boolean;
}

export class UpdatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodToken!: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  last4?: string;

  @IsString()
  @IsOptional()
  expiryMonth?: string;

  @IsString()
  @IsOptional()
  expiryYear?: string;
}
