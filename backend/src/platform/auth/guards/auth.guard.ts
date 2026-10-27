import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtTokenService } from '../jwt-token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const payload = this.jwtTokenService.verifyAccessToken(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
    };

    return true;
  }
}
