import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';

export class ConnectProviderDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsOptional()
  redirectUri?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customScopes?: string[];
}

export class OAuthCallbackDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsOptional()
  error?: string;
}
