import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnquiryDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'jane@acme.inc' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({ example: 'biz-growth' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  productInterest?: string;

  @ApiProperty({ example: 'We would like to request an enterprise demo.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ example: 'landing-hero' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}
