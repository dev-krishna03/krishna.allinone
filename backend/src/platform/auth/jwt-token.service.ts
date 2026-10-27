import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtTokenService {
  private readonly jwtSecret: string = process.env.JWT_SECRET || 'business-os-super-secret-jwt-key-minimum-32-chars!';
  private readonly accessExpiresIn: string = '15m'; // 15 minutes short-lived access token

  signAccessToken(userId: string, email: string, sessionId: string): string {
    return jwt.sign(
      { sub: userId, email, sessionId, type: 'access' } as JwtPayload,
      this.jwtSecret,
      { expiresIn: this.accessExpiresIn as any }
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      if (decoded.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
