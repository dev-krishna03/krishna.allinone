import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Ip,
  Headers,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignUpDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/auth-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new identity user with password' })
  async signUp(
    @Body() dto: SignUpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.authService.signUp(dto, ip, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.authService.refresh(dto.refreshToken, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate current session' })
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.sessionId);
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token (does not disclose email presence)' })
  async requestPasswordReset(
    @Body() dto: ResetPasswordRequestDto,
    @Ip() ip: string
  ) {
    return this.authService.requestPasswordReset(dto.email, ip);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with single-use token and revoke all existing sessions' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with single-use verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }
}

@ApiTags('Identity Sessions')
@Controller('me/sessions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'List all active sessions for current user' })
  async getSessions(@CurrentUser() user: any) {
    return this.authService.listUserSessions(user.id, user.sessionId);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Revoke a specific active session' })
  async revokeSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ) {
    return this.authService.revokeSession(user.id, sessionId);
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all sessions (logout everywhere)' })
  async revokeAllSessions(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.id);
  }
}
