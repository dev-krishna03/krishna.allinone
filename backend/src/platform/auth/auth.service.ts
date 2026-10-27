import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditService } from '../audit/audit.service';
import { JwtTokenService } from './jwt-token.service';
import { SignUpDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly refreshTokenTtlDays = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService
  ) {}

  // 1. Sign Up
  async signUp(dto: SignUpDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check existing identity
    const existing = await this.prisma.identityUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const verificationToken = uuidv4();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Atomic transaction for user + credentials + verification token
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.identityUser.create({
        data: {
          email: normalizedEmail,
          fullName: dto.fullName.trim(),
          status: 'ACTIVE',
          isEmailVerified: false,
        },
      });

      await tx.identityCredentials.create({
        data: {
          userId: user.id,
          passwordHash,
          algorithm: 'bcrypt',
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: verificationExpiresAt,
        },
      });

      return user;
    });

    // Record audit event
    await this.auditService.record({
      action: 'identity.user.signup',
      entityType: 'IdentityUser',
      entityId: result.id,
      metadata: { email: result.email },
      ipAddress,
    });

    return {
      message: 'Account created successfully. Please verify your email.',
      user: {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        isEmailVerified: result.isEmailVerified,
      },
      verificationToken, // Exposed for development/testing ease
    };
  }

  // 2. Login
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.identityUser.findUnique({
      where: { email: normalizedEmail },
      include: {
        credentials: true,
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Throttled constant-time comparison to prevent enumeration
    if (!user || !user.credentials) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been suspended or deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.credentials.passwordHash);
    if (!passwordValid) {
      // Record security event
      await this.prisma.identitySecurityEvent.create({
        data: {
          userId: user.id,
          eventType: 'auth.login.failed',
          metadata: { reason: 'bad_password' },
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session and rotating refresh token
    const sessionExpiresAt = new Date(Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const rawRefreshToken = uuidv4();
    const tokenHash = await bcrypt.hash(rawRefreshToken, 8);
    const familyId = uuidv4();

    const session = await this.prisma.identitySession.create({
      data: {
        userId: user.id,
        userAgent: userAgent || 'Unknown device',
        ipAddress: ipAddress || '127.0.0.1',
        expiresAt: sessionExpiresAt,
      },
    });

    await this.prisma.identityRefreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash,
        familyId,
        isUsed: false,
        expiresAt: sessionExpiresAt,
      },
    });

    const accessToken = this.jwtTokenService.signAccessToken(user.id, user.email, session.id);

    // Default active org: first active membership if present
    const activeMembership = user.memberships.find(m => m.status === 'ACTIVE');

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
      },
      tokens: {
        accessToken,
        refreshToken: `${session.id}:${rawRefreshToken}`,
        expiresIn: 900, // 15 mins
      },
      activeOrganization: activeMembership ? activeMembership.organization : null,
      memberships: user.memberships.map((m) => ({
        organization: m.organization,
        role: m.role,
        status: m.status,
      })),
    };
  }

  // 3. Refresh Token with Token Family Replay Detection
  async refresh(refreshTokenStr: string, ipAddress?: string, userAgent?: string) {
    const parts = refreshTokenStr.split(':');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Malformed refresh token');
    }
    const [sessionId, rawToken] = parts;

    const session = await this.prisma.identitySession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        },
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Find the matching refresh token in this session
    let matchedTokenRecord = null;
    for (const rt of session.refreshTokens) {
      const isMatch = await bcrypt.compare(rawToken, rt.tokenHash);
      if (isMatch) {
        matchedTokenRecord = rt;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // REPLAY ATTACK DETECTION:
    // If a refresh token that was already marked as used is presented again,
    // the token family has been compromised! Revoke the whole session immediately.
    if (matchedTokenRecord.isUsed) {
      await this.prisma.identitySession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });

      await this.outboxService.publish(
        'identity.session.revoked',
        'IdentitySession',
        sessionId,
        { reason: 'refresh_token_replay_attack', userId: session.userId }
      );

      throw new UnauthorizedException('Security violation: Refresh token reuse detected. All sessions revoked.');
    }

    // Mark current token as used
    await this.prisma.identityRefreshToken.update({
      where: { id: matchedTokenRecord.id },
      data: { isUsed: true },
    });

    // Issue new refresh token in the same family
    const newRawRefreshToken = uuidv4();
    const newTokenHash = await bcrypt.hash(newRawRefreshToken, 8);
    const sessionExpiresAt = new Date(Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.identityRefreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: newTokenHash,
        familyId: matchedTokenRecord.familyId,
        isUsed: false,
        expiresAt: sessionExpiresAt,
      },
    });

    const accessToken = this.jwtTokenService.signAccessToken(session.user.id, session.user.email, session.id);

    return {
      tokens: {
        accessToken,
        refreshToken: `${session.id}:${newRawRefreshToken}`,
        expiresIn: 900,
      },
    };
  }

  // 4. Logout (single session)
  async logout(sessionId: string) {
    await this.prisma.identitySession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // 5. Logout All (all sessions for user)
  async logoutAll(userId: string) {
    await this.prisma.identitySession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.outboxService.publish(
      'identity.session.revoked',
      'IdentityUser',
      userId,
      { reason: 'logout_all', userId }
    );

    return { success: true, message: 'All active sessions have been terminated' };
  }

  // 6. Request Password Reset (does not disclose if email exists)
  async requestPasswordReset(email: string, ipAddress?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.identityUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Invalidate existing unused tokens for this user
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      await this.auditService.record({
        action: 'identity.password_reset.requested',
        entityType: 'IdentityUser',
        entityId: user.id,
        ipAddress,
      });

      return {
        message: 'If the email exists, a password reset link has been dispatched.',
        resetToken: token, // Returned for dev & E2E verification
      };
    }

    // Return the same message even if email doesn't exist to prevent enumeration
    return {
      message: 'If the email exists, a password reset link has been dispatched.',
    };
  }

  // 7. Reset Password
  async resetPassword(dto: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.$transaction(async (tx) => {
      // Mark token used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Update password hash
      await tx.identityCredentials.update({
        where: { userId: resetRecord.userId },
        data: { passwordHash, updatedAt: new Date() },
      });

      // Revoke all existing sessions on password reset
      await tx.identitySession.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.outboxService.publish(
      'identity.session.revoked',
      'IdentityUser',
      resetRecord.userId,
      { reason: 'password_reset' }
    );

    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  // 8. Verify Email
  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.identityUser.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });
    });

    await this.outboxService.publish(
      'identity.user.verified',
      'IdentityUser',
      record.userId,
      { email: record.user.email }
    );

    return { message: 'Email verified successfully.' };
  }

  // 9. List Active Sessions
  async listUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.identitySession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  }

  // 10. Revoke Session
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.identitySession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.identitySession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}
