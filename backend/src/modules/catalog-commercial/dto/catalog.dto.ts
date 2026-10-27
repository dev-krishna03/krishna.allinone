import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';
import {
  FeatureType,
  PlanEdition,
} from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  category?: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];
}

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FeatureType)
  @IsNotEmpty()
  type!: FeatureType;

  @IsOptional()
  defaultLimit?: number;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(PlanEdition)
  @IsNotEmpty()
  edition!: PlanEdition;

  @IsString()
  @IsNotEmpty()
  billingInterval!: 'MONTHLY' | 'YEARLY';

  @IsString()
  @IsOptional()
  productId?: string | null;

  @IsBoolean()
  @IsOptional()
  isBundle?: boolean;

  @IsNumber()
  @Min(0)
  priceAmount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  includedSeats?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  featureLimits?: Record<string, any>;
}

export class CreateBundleDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  productIds!: string[];
}

export class SubscribeEntitlementDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsOptional()
  planVersionId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  seats?: number;

  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  assignedSeatsLimit?: number;
}

export class AssignSeatDto {
  @IsString()
  @IsNotEmpty()
  entitlementId!: string;

  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @IsString()
  @IsOptional()
  productId?: string;
}

export class RecordUsageDto {
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsString()
  @IsNotEmpty()
  featureCode!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  metadata?: any;
}
