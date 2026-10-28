import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { IncidentSeverity, IncidentStatus, PlanEdition } from '@prisma/client';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedServices?: string[];
}

export class UpdateIncidentDto {
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @IsString()
  @IsOptional()
  timelineMessage?: string;
}

export class CreateFeatureRolloutDto {
  @IsString()
  @IsNotEmpty()
  flagKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsArray()
  @IsEnum(PlanEdition, { each: true })
  @IsOptional()
  targetEditions?: PlanEdition[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetOrganizationIds?: string[];
}

export class UpdateFeatureRolloutDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsArray()
  @IsEnum(PlanEdition, { each: true })
  @IsOptional()
  targetEditions?: PlanEdition[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetOrganizationIds?: string[];
}
