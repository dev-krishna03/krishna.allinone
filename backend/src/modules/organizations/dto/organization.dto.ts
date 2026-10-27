import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, MemberStatus } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MinLength(3)
  @MaxLength(60)
  slug!: string;

  @ApiPropertyOptional({ example: 'Acme Global Holdings Inc.' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@acme.inc' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.MANAGER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: MemberStatus, example: MemberStatus.SUSPENDED })
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'invitation-token-uuid' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class TransferOwnershipDto {
  @ApiProperty({ example: 'target-user-uuid' })
  @IsString()
  @IsNotEmpty()
  newOwnerUserId!: string;
}
