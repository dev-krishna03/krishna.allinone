import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'alex@acme.inc' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'P@ssword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  password!: string;

  @ApiProperty({ example: 'Alex Mercer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex@acme.inc' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'P@ssword123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'uuid-or-refresh-token-string' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'alex@acme.inc' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-value' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewSecret123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'verification-token-value' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
