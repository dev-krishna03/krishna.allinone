import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { AuthController, SessionsController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  controllers: [AuthController, SessionsController],
  providers: [AuthService, JwtTokenService, AuthGuard, TenantGuard, RolesGuard],
  exports: [AuthService, JwtTokenService, AuthGuard, TenantGuard, RolesGuard],
})
export class AuthModule {}
