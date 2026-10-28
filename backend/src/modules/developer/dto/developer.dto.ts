import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateDeveloperApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  rateLimitPerMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  monthlyQuota?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  expiresInDays?: number;
}
