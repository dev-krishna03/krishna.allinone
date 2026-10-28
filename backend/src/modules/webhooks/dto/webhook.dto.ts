import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { WebhookSubscriptionStatus } from '@prisma/client';

export class CreateWebhookSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  targetUrl!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  subscribedEvents!: string[];

  @IsString()
  @IsOptional()
  secretKey?: string;
}

export class UpdateWebhookSubscriptionDto {
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  targetUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subscribedEvents?: string[];

  @IsEnum(WebhookSubscriptionStatus)
  @IsOptional()
  status?: WebhookSubscriptionStatus;
}
